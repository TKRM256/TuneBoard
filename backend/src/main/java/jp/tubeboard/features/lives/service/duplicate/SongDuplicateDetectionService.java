package jp.tubeboard.features.lives.service.duplicate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse.Confidence;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse.DuplicateGroup;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse.DuplicateSongEntry;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.model.SongDuplicateResult;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.repository.SongDuplicateResultRepository;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.duplicate.MusicBrainzService.MusicBrainzRecording;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SongDuplicateDetectionService {

    private static final Logger log = LoggerFactory.getLogger(SongDuplicateDetectionService.class);
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("[\\s\\p{Z}]+");

    private final MusicBrainzService musicBrainzService;
    private final SettingSheetSubmissionService settingSheetSubmissionService;
    private final SettingSheetConfigService settingSheetConfigService;
    private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
    private final SongDuplicateResultRepository songDuplicateResultRepository;
    private final PlatformTransactionManager transactionManager;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    /**
     * 非同期で曲かぶり検出を実行し、結果をDBに保存する。
     * 呼び出し元のトランザクションがコミットした後に呼ぶこと。
     * 提出データに変更がなければスキップする。
     */
    @Async
    public void computeAndStoreAsync(UUID liveId) {
        try {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                doComputeAndStore(liveId, false);
            });
        } catch (Exception ex) {
            log.warn("曲かぶり検出の非同期処理に失敗: liveId={}", liveId, ex);
        }
    }

    /**
     * 同期的に曲かぶり検出を実行し、結果をDBに保存して返す。
     * 提出データに変更がなければキャッシュを返す。
     */
    public SongDuplicateResponse computeAndStoreSync(UUID liveId) {
        return new TransactionTemplate(transactionManager).execute(status -> {
            return doComputeAndStore(liveId, false);
        });
    }

    /**
     * 強制的に再計算する（明示的なリフレッシュ用）。
     */
    public SongDuplicateResponse forceComputeAndStoreSync(UUID liveId) {
        return new TransactionTemplate(transactionManager).execute(status -> {
            return doComputeAndStore(liveId, true);
        });
    }

    public Optional<SongDuplicateResponse> getCachedResult(UUID liveId) {
        final Optional<SongDuplicateResponse> response = songDuplicateResultRepository.findByLiveId(liveId)
                .map(stored -> {
                    try {
                        return objectMapper.readValue(stored.getResultJson(), SongDuplicateResponse.class);
                    } catch (Exception ex) {
                        log.warn("キャッシュ結果のデシリアライズに失敗: liveId={}", liveId, ex);
                        return null;
                    }
                });
        return response;
    }

    /**
     * 指定タイトルの dismissed フラグをトグルし、更新後の結果を返す。
     */
    public SongDuplicateResponse toggleDismiss(UUID liveId, String normalizedTitle) {
        SongDuplicateResult stored = songDuplicateResultRepository.findByLiveId(liveId)
                .orElseThrow(() -> new IllegalStateException("曲かぶり結果が見つかりません"));

        try {
            SongDuplicateResponse current = objectMapper.readValue(stored.getResultJson(), SongDuplicateResponse.class);
            String target = normalize(normalizedTitle);

            List<DuplicateGroup> updated = current.groups().stream()
                    .map(g -> normalize(g.normalizedTitle()).equals(target)
                            ? new DuplicateGroup(g.normalizedTitle(), g.normalizedArtist(), g.mbid(),
                                    g.confidence(), !g.dismissed(), g.entries())
                            : g)
                    .toList();

            long activeCount = updated.stream().filter(g -> !g.dismissed()).count();
            SongDuplicateResponse result = new SongDuplicateResponse((int) activeCount, updated);

            stored.setResultJson(objectMapper.writeValueAsString(result));
            stored.setComputedAt(LocalDateTime.now());
            songDuplicateResultRepository.save(stored);

            return result;
        } catch (Exception ex) {
            throw new IllegalStateException("dismissed トグルに失敗", ex);
        }
    }

    private SongDuplicateResponse doComputeAndStore(UUID liveId, boolean force) {
        List<SettingSheetSubmission> submissions = settingSheetSubmissionRepository
                .findAllByLiveIdOrderByCreatedAtDesc(liveId);

        Live live = submissions.stream().findFirst()
                .map(SettingSheetSubmission::getLive)
                .orElse(null);
        if (live == null) {
            return new SongDuplicateResponse(0, List.of());
        }

        // フィンガープリントで変更チェック — 変更なしならキャッシュを返す
        String fingerprint = computeFingerprint(submissions);
        if (!force) {
            Optional<SongDuplicateResult> cached = songDuplicateResultRepository.findByLiveId(liveId);
            if (cached.isPresent() && fingerprint.equals(cached.get().getSubmissionsFingerprint())) {
                try {
                    log.debug("提出データに変更なし、キャッシュを返却: liveId={}", liveId);
                    return objectMapper.readValue(cached.get().getResultJson(), SongDuplicateResponse.class);
                } catch (Exception ex) {
                    log.warn("キャッシュのデシリアライズに失敗、再計算します: liveId={}", liveId, ex);
                }
            }
        }

        // 前回の dismissed タイトルを引き継ぐ
        java.util.Set<String> previousDismissed = new java.util.HashSet<>();
        songDuplicateResultRepository.findByLiveId(liveId).ifPresent(prev -> {
            try {
                SongDuplicateResponse old = objectMapper.readValue(prev.getResultJson(), SongDuplicateResponse.class);
                for (DuplicateGroup g : old.groups()) {
                    if (g.dismissed()) {
                        previousDismissed.add(normalize(g.normalizedTitle()));
                    }
                }
            } catch (Exception ex) {
                log.warn("前回結果の読み取りに失敗: liveId={}", liveId, ex);
            }
        });

        SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);

        SongDuplicateResponse result = detectDuplicates(submissions, config, previousDismissed);

        try {
            String json = objectMapper.writeValueAsString(result);
            SongDuplicateResult stored = songDuplicateResultRepository.findByLiveId(liveId)
                    .orElse(SongDuplicateResult.builder().live(live).build());
            stored.setResultJson(json);
            stored.setComputedAt(LocalDateTime.now());
            stored.setSubmissionsFingerprint(fingerprint);
            songDuplicateResultRepository.save(stored);
        } catch (Exception ex) {
            log.warn("曲かぶり検出結果の保存に失敗: liveId={}", liveId, ex);
        }

        return result;
    }

    /**
     * 提出データのSHA-256フィンガープリントを計算する。
     * ID + payloadJsonのハッシュにより、追加・削除・更新すべてを検出できる。
     */
    private String computeFingerprint(List<SettingSheetSubmission> submissions) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            submissions.stream()
                    .sorted(Comparator.comparing(s -> s.getId().toString()))
                    .forEach(s -> {
                        md.update(s.getId().toString().getBytes(StandardCharsets.UTF_8));
                        md.update(s.getPayloadJson().getBytes(StandardCharsets.UTF_8));
                    });
            return HexFormat.of().formatHex(md.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public SongDuplicateResponse detectDuplicates(
            List<SettingSheetSubmission> submissions,
            SettingSheetConfigResponse config,
            java.util.Set<String> dismissedTitles) {

        // 1. 全提出から曲情報を抽出
        List<ExtractedSong> allSongs = new ArrayList<>();
        for (SettingSheetSubmission submission : submissions) {
            PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService
                    .readSubmissionPayload(submission.getPayloadJson());
            List<ExtractedSong> songs = extractSongs(submission.getId(), submission.getRecordLabel(),
                    config.blocks(), payload.answers());
            allSongs.addAll(songs);
        }

        if (allSongs.isEmpty()) {
            return new SongDuplicateResponse(0, List.of());
        }

        // 2. ローカル正規化でグルーピング
        Map<String, List<ExtractedSong>> localGroups = new LinkedHashMap<>();
        for (ExtractedSong song : allSongs) {
            String key = song.normalizedKey();
            localGroups.computeIfAbsent(key, k -> new ArrayList<>()).add(song);
        }

        // 3. MusicBrainz APIで重複候補をさらに正規化
        // groupKey -> songs, groupKey -> confidence
        Map<String, List<ExtractedSong>> resolvedGroups = new LinkedHashMap<>();
        Map<String, Confidence> groupConfidence = new LinkedHashMap<>();
        Map<String, MusicBrainzRecording> mbCache = new LinkedHashMap<>();

        for (Map.Entry<String, List<ExtractedSong>> entry : localGroups.entrySet()) {
            List<ExtractedSong> songs = entry.getValue();
            ExtractedSong representative = songs.getFirst();

            String cacheKey = representative.normalizedKey();
            MusicBrainzRecording recording = mbCache.get(cacheKey);
            if (recording == null) {
                Optional<MusicBrainzRecording> result = musicBrainzService.searchRecording(
                        representative.title, representative.artist);
                recording = result.orElse(null);
                mbCache.put(cacheKey, recording);
            }

            String groupKey = recording != null ? "mbid:" + recording.mbid() : "local:" + cacheKey;
            Confidence confidence = recording != null ? Confidence.HIGH : Confidence.LOW;
            resolvedGroups.computeIfAbsent(groupKey, k -> new ArrayList<>()).addAll(songs);
            groupConfidence.merge(groupKey, confidence, (a, b) -> a.ordinal() < b.ordinal() ? a : b);
        }

        // 4. 同じ正規化タイトルを持つグループをマージ（アーティスト名表記揺れ対策）
        Map<String, List<String>> titleToGroupKeys = new LinkedHashMap<>();
        for (Map.Entry<String, List<ExtractedSong>> entry : resolvedGroups.entrySet()) {
            String normalizedTitle = normalize(entry.getValue().getFirst().title);
            titleToGroupKeys.computeIfAbsent(normalizedTitle, k -> new ArrayList<>()).add(entry.getKey());
        }

        Map<String, List<ExtractedSong>> mergedGroups = new LinkedHashMap<>();
        Map<String, Confidence> mergedConfidence = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> titleEntry : titleToGroupKeys.entrySet()) {
            List<String> groupKeys = titleEntry.getValue();
            String mergeKey = groupKeys.getFirst();
            List<ExtractedSong> merged = new ArrayList<>();
            Confidence conf = groupConfidence.getOrDefault(mergeKey, Confidence.LOW);
            for (String key : groupKeys) {
                merged.addAll(resolvedGroups.get(key));
                Confidence c = groupConfidence.getOrDefault(key, Confidence.LOW);
                if (c.ordinal() < conf.ordinal())
                    conf = c;
            }
            // 複数グループが exact-title でマージされた場合は MEDIUM に下げる
            if (groupKeys.size() > 1 && conf == Confidence.HIGH)
                conf = Confidence.MEDIUM;
            mergedGroups.put(mergeKey, merged);
            mergedConfidence.put(mergeKey, conf);
        }

        // 4b. タイトル部分一致でさらにマージ (「夏祭」⊂「夏祭り」のようなケース)
        List<String> mergedKeys = new ArrayList<>(mergedGroups.keySet());
        Map<String, String> redirectMap = new LinkedHashMap<>(); // redirected key -> canonical key

        for (int i = 0; i < mergedKeys.size(); i++) {
            String keyA = mergedKeys.get(i);
            String canonA = followRedirect(redirectMap, keyA);
            String titleA = normalize(mergedGroups.get(keyA).getFirst().title);

            for (int j = i + 1; j < mergedKeys.size(); j++) {
                String keyB = mergedKeys.get(j);
                String canonB = followRedirect(redirectMap, keyB);
                if (canonA.equals(canonB))
                    continue; // already merged

                String titleB = normalize(mergedGroups.get(keyB).getFirst().title);

                if (titleA.contains(titleB) || titleB.contains(titleA)) {
                    // Merge B into A (A is canonical)
                    redirectMap.put(canonB, canonA);
                }
            }
        }

        if (!redirectMap.isEmpty()) {
            Map<String, List<ExtractedSong>> fuzzyMerged = new LinkedHashMap<>();
            Map<String, Confidence> fuzzyConfidence = new LinkedHashMap<>();

            for (String key : mergedKeys) {
                String canonical = followRedirect(redirectMap, key);
                fuzzyMerged.computeIfAbsent(canonical, k -> new ArrayList<>()).addAll(mergedGroups.get(key));
                Confidence existing = fuzzyConfidence.getOrDefault(canonical, Confidence.LOW);
                Confidence current = mergedConfidence.getOrDefault(key, Confidence.LOW);
                // fuzzy merge → at most MEDIUM
                Confidence combined = existing.ordinal() < current.ordinal() ? existing : current;
                if (!canonical.equals(key))
                    combined = Confidence.MEDIUM;
                fuzzyConfidence.put(canonical, combined);
            }

            mergedGroups = fuzzyMerged;
            mergedConfidence = fuzzyConfidence;
        }

        // 5. 実際に重複があるグループだけを結果に含める
        List<DuplicateGroup> duplicateGroups = new ArrayList<>();
        for (Map.Entry<String, List<ExtractedSong>> entry : mergedGroups.entrySet()) {
            List<ExtractedSong> songs = entry.getValue();
            if (songs.size() < 2) {
                continue;
            }

            long distinctSubmissions = songs.stream()
                    .map(ExtractedSong::submissionId)
                    .distinct()
                    .count();
            if (distinctSubmissions < 2) {
                continue;
            }

            String mbid = entry.getKey().startsWith("mbid:")
                    ? entry.getKey().substring(5)
                    : "";
            MusicBrainzRecording recording = mbid.isEmpty() ? null
                    : mbCache.values().stream()
                            .filter(r -> r != null && r.mbid().equals(mbid))
                            .findFirst()
                            .orElse(null);

            String groupTitle = recording != null ? recording.title() : songs.getFirst().title;
            String groupArtist = recording != null ? recording.artist() : songs.getFirst().artist;
            Confidence confidence = mergedConfidence.getOrDefault(entry.getKey(), Confidence.LOW);
            boolean dismissed = dismissedTitles != null && dismissedTitles.contains(normalize(groupTitle));

            List<DuplicateSongEntry> entries = songs.stream()
                    .map(song -> new DuplicateSongEntry(
                            song.submissionId,
                            song.recordLabel,
                            song.title,
                            song.artist))
                    .toList();

            duplicateGroups.add(new DuplicateGroup(groupTitle, groupArtist, mbid, confidence, dismissed, entries));
        }

        long activeCount = duplicateGroups.stream().filter(g -> !g.dismissed()).count();
        return new SongDuplicateResponse((int) activeCount, duplicateGroups);
    }

    private String followRedirect(Map<String, String> redirectMap, String key) {
        String current = key;
        while (redirectMap.containsKey(current)) {
            current = redirectMap.get(current);
        }
        return current;
    }

    private List<ExtractedSong> extractSongs(
            UUID submissionId,
            String recordLabel,
            List<FormBlockResponse> blocks,
            List<FieldAnswerRequest> answers) {
        List<ExtractedSong> songs = new ArrayList<>();
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);

        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }

            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                songs.addAll(extractSongs(submissionId, recordLabel, block.fields(), answers));
                continue;
            }

            if (!SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                continue;
            }

            // 曲ブロックかどうかを判定: 子フィールドに "song-title" があれば曲ブロックとみなす
            SongFieldIds songFieldIds = detectSongFields(block.fields());
            if (songFieldIds == null) {
                // 入れ子のrepeatable group内にも曲がある可能性を探索
                FieldAnswerRequest answer = answerMap.get(block.id());
                if (answer != null) {
                    for (GroupItemRequest item : answer.items()) {
                        songs.addAll(extractSongs(submissionId, recordLabel, block.fields(), item.answers()));
                    }
                }
                continue;
            }

            FieldAnswerRequest answer = answerMap.get(block.id());
            if (answer == null) {
                continue;
            }

            for (GroupItemRequest item : answer.items()) {
                Map<String, FieldAnswerRequest> itemAnswerMap = toAnswerMap(item.answers());

                FieldAnswerRequest titleAnswer = itemAnswerMap.get(songFieldIds.titleFieldId);
                FieldAnswerRequest artistAnswer = songFieldIds.artistFieldId != null
                        ? itemAnswerMap.get(songFieldIds.artistFieldId)
                        : null;

                String title = titleAnswer != null && !titleAnswer.values().isEmpty()
                        ? titleAnswer.values().getFirst()
                        : "";
                String artist = artistAnswer != null && !artistAnswer.values().isEmpty()
                        ? artistAnswer.values().getFirst()
                        : "";

                if (!title.isBlank()) {
                    songs.add(new ExtractedSong(submissionId, recordLabel, title.trim(), artist.trim()));
                }
            }
        }

        return songs;
    }

    private SongFieldIds detectSongFields(List<FormBlockResponse> fields) {
        String titleFieldId = null;
        String artistFieldId = null;

        for (FormBlockResponse field : fields) {
            String role = field.duplicateDetectionRole();
            if (role == null) {
                continue;
            }

            if (SettingSheetConstants.DUPLICATE_ROLE_SONG_TITLE.equals(role)) {
                titleFieldId = field.id();
            }

            if (SettingSheetConstants.DUPLICATE_ROLE_SONG_ARTIST.equals(role)) {
                artistFieldId = field.id();
            }
        }

        return titleFieldId != null ? new SongFieldIds(titleFieldId, artistFieldId) : null;
    }

    private Map<String, FieldAnswerRequest> toAnswerMap(List<FieldAnswerRequest> answers) {
        Map<String, FieldAnswerRequest> map = new LinkedHashMap<>();
        if (answers == null) {
            return map;
        }
        for (FieldAnswerRequest answer : answers) {
            if (answer.fieldId() != null && !answer.fieldId().isBlank()) {
                map.put(answer.fieldId(), answer);
            }
        }
        return map;
    }

    static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        // NFKC正規化 → 全角半角統一
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFKC);
        // 小文字化
        normalized = normalized.toLowerCase();
        // 連続空白を1つに
        normalized = WHITESPACE_PATTERN.matcher(normalized).replaceAll(" ");
        return normalized;
    }

    private record SongFieldIds(String titleFieldId, String artistFieldId) {
    }

    private record ExtractedSong(UUID submissionId, String recordLabel, String title, String artist) {
        String normalizedKey() {
            return normalize(title) + "|" + normalize(artist);
        }
    }
}

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

import com.atilika.kuromoji.ipadic.Token;
import com.atilika.kuromoji.ipadic.Tokenizer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;
import jp.tubeboard.features.lives.dto.request.PublicSongDuplicateCheckRequest;
import jp.tubeboard.features.lives.dto.response.PublicSongDuplicateCheckResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse.Confidence;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse.DuplicateGroup;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse.DuplicateSongEntry;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.model.SongDuplicateResult;
import jp.tubeboard.features.lives.model.ItunesTrackLink;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.repository.SongDuplicateResultRepository;
import jp.tubeboard.features.lives.repository.ItunesTrackLinkRepository;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SongDuplicateDetectionService {

    private static final Logger log = LoggerFactory.getLogger(SongDuplicateDetectionService.class);
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("[\\s\\p{Z}]+");
    private static final Tokenizer KUROMOJI_TOKENIZER = new Tokenizer();

    private final SettingSheetSubmissionService settingSheetSubmissionService;
    private final SettingSheetConfigService settingSheetConfigService;
    private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
    private final SongDuplicateResultRepository songDuplicateResultRepository;
    private final ItunesTrackLinkRepository itunesTrackLinkRepository;
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
                            ? new DuplicateGroup(g.normalizedTitle(), g.normalizedArtist(), g.itunesTrackId(),
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

        // 2. iTunesトラックリンクを取得して曲に紐付け
        List<UUID> submissionIds = submissions.stream().map(SettingSheetSubmission::getId).toList();
        List<ItunesTrackLink> allLinks = itunesTrackLinkRepository.findAllBySubmissionIdIn(submissionIds);
        Map<String, String> songToItunesTrackId = new LinkedHashMap<>();
        for (ItunesTrackLink link : allLinks) {
            String key = link.getSubmission().getId() + "|" + link.getSongTitle() + "|" + link.getSongArtist();
            songToItunesTrackId.put(key, link.getItunesTrackId());
        }

        // 3. ローカル正規化でグルーピング
        Map<String, List<ExtractedSong>> localGroups = new LinkedHashMap<>();
        for (ExtractedSong song : allSongs) {
            String key = song.normalizedKey();
            localGroups.computeIfAbsent(key, k -> new ArrayList<>()).add(song);
        }

        // 4. iTunes トラックIDでグルーピング（同じトラックIDなら同一曲）
        Map<String, List<ExtractedSong>> resolvedGroups = new LinkedHashMap<>();
        Map<String, Confidence> groupConfidence = new LinkedHashMap<>();

        for (Map.Entry<String, List<ExtractedSong>> entry : localGroups.entrySet()) {
            List<ExtractedSong> songs = entry.getValue();
            ExtractedSong representative = songs.getFirst();

            String itunesKey = representative.submissionId + "|" + representative.title + "|" + representative.artist;
            String itunesTrackId = songToItunesTrackId.get(itunesKey);

            String groupKey = itunesTrackId != null ? "itunes:" + itunesTrackId : "local:" + entry.getKey();
            Confidence confidence = itunesTrackId != null ? Confidence.HIGH : Confidence.LOW;
            resolvedGroups.computeIfAbsent(groupKey, k -> new ArrayList<>()).addAll(songs);
            groupConfidence.merge(groupKey, confidence, (a, b) -> a.ordinal() < b.ordinal() ? a : b);
        }

        // 5. 同じ正規化タイトルを持つグループをマージ（アーティスト名表記揺れ対策）
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
            if (groupKeys.size() > 1 && conf == Confidence.HIGH)
                conf = Confidence.MEDIUM;
            mergedGroups.put(mergeKey, merged);
            mergedConfidence.put(mergeKey, conf);
        }

        // 5a. 読み仮名ベースのマージ（漢字/ひらがな表記揺れ対策: 「夏祭り」=「なつまつり」）
        Map<String, List<String>> readingToGroupKeys = new LinkedHashMap<>();
        for (Map.Entry<String, List<ExtractedSong>> entry : mergedGroups.entrySet()) {
            String readingTitle = toReading(entry.getValue().getFirst().title);
            readingToGroupKeys.computeIfAbsent(readingTitle, k -> new ArrayList<>()).add(entry.getKey());
        }

        Map<String, List<ExtractedSong>> readingMerged = new LinkedHashMap<>();
        Map<String, Confidence> readingMergedConfidence = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> readingEntry : readingToGroupKeys.entrySet()) {
            List<String> groupKeys = readingEntry.getValue();
            String mergeKey = groupKeys.getFirst();
            List<ExtractedSong> rMerged = new ArrayList<>();
            Confidence conf = mergedConfidence.getOrDefault(mergeKey, Confidence.LOW);
            for (String key : groupKeys) {
                rMerged.addAll(mergedGroups.get(key));
                Confidence c = mergedConfidence.getOrDefault(key, Confidence.LOW);
                if (c.ordinal() < conf.ordinal())
                    conf = c;
            }
            if (groupKeys.size() > 1 && conf == Confidence.HIGH)
                conf = Confidence.MEDIUM;
            readingMerged.put(mergeKey, rMerged);
            readingMergedConfidence.put(mergeKey, conf);
        }

        mergedGroups = readingMerged;
        mergedConfidence = readingMergedConfidence;

        // 5b. タイトル部分一致でさらにマージ (「夏祭」⊂「夏祭り」のようなケース)
        List<String> mergedKeys = new ArrayList<>(mergedGroups.keySet());
        Map<String, String> redirectMap = new LinkedHashMap<>();

        for (int i = 0; i < mergedKeys.size(); i++) {
            String keyA = mergedKeys.get(i);
            String canonA = followRedirect(redirectMap, keyA);
            String titleA = normalize(mergedGroups.get(keyA).getFirst().title);

            for (int j = i + 1; j < mergedKeys.size(); j++) {
                String keyB = mergedKeys.get(j);
                String canonB = followRedirect(redirectMap, keyB);
                if (canonA.equals(canonB))
                    continue;

                String titleB = normalize(mergedGroups.get(keyB).getFirst().title);

                if (titleA.contains(titleB) || titleB.contains(titleA)) {
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
                Confidence combined = existing.ordinal() < current.ordinal() ? existing : current;
                if (!canonical.equals(key))
                    combined = Confidence.MEDIUM;
                fuzzyConfidence.put(canonical, combined);
            }

            mergedGroups = fuzzyMerged;
            mergedConfidence = fuzzyConfidence;
        }

        // 6. 実際に重複があるグループだけを結果に含める
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

            String itunesTrackId = entry.getKey().startsWith("itunes:")
                    ? entry.getKey().substring(7)
                    : "";

            String groupTitle = songs.getFirst().title;
            String groupArtist = songs.getFirst().artist;
            Confidence confidence = mergedConfidence.getOrDefault(entry.getKey(), Confidence.LOW);
            boolean dismissed = dismissedTitles != null && dismissedTitles.contains(normalize(groupTitle));

            List<DuplicateSongEntry> entries = songs.stream()
                    .map(song -> new DuplicateSongEntry(
                            song.submissionId,
                            song.recordLabel,
                            song.title,
                            song.artist))
                    .toList();

            duplicateGroups.add(new DuplicateGroup(groupTitle, groupArtist, itunesTrackId, confidence, dismissed,
                    entries));
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

            // SONG ブロックがあるか確認
            String songBlockId = detectSongBlockId(block.fields());
            // 従来の duplicateDetectionRole による検出
            SongFieldIds songFieldIds = songBlockId == null ? detectSongFields(block.fields()) : null;

            if (songBlockId == null && songFieldIds == null) {
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

                String title;
                String artist;

                if (songBlockId != null) {
                    // SONG ブロック: values[0] = 曲名, values[1] = アーティスト
                    FieldAnswerRequest songAnswer = itemAnswerMap.get(songBlockId);
                    title = songAnswer != null && !songAnswer.values().isEmpty()
                            ? songAnswer.values().getFirst()
                            : "";
                    artist = songAnswer != null && songAnswer.values().size() > 1
                            ? songAnswer.values().get(1)
                            : "";
                } else {
                    // 従来方式: 個別フィールドから取得
                    FieldAnswerRequest titleAnswer = itemAnswerMap.get(songFieldIds.titleFieldId);
                    FieldAnswerRequest artistAnswer = songFieldIds.artistFieldId != null
                            ? itemAnswerMap.get(songFieldIds.artistFieldId)
                            : null;

                    title = titleAnswer != null && !titleAnswer.values().isEmpty()
                            ? titleAnswer.values().getFirst()
                            : "";
                    artist = artistAnswer != null && !artistAnswer.values().isEmpty()
                            ? artistAnswer.values().getFirst()
                            : "";
                }

                if (!title.isBlank()) {
                    songs.add(new ExtractedSong(submissionId, recordLabel, title.trim(), artist.trim()));
                }
            }
        }

        return songs;
    }

    private String detectSongBlockId(List<FormBlockResponse> fields) {
        for (FormBlockResponse field : fields) {
            if (SettingSheetConstants.BLOCK_SONG.equals(field.type())) {
                return field.id();
            }
        }
        return null;
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

    /**
     * 漢字を含むテキストをひらがな読みに変換する。
     * Kuromojiで形態素解析し、各トークンの読みを取得してひらがなに変換する。
     * 例: "夏祭り" → "なつまつり", "なつまつり" → "なつまつり"
     */
    static String toReading(String value) {
        String normalized = normalize(value);
        if (normalized.isEmpty()) {
            return "";
        }
        StringBuilder reading = new StringBuilder();
        for (Token token : KUROMOJI_TOKENIZER.tokenize(normalized)) {
            String tokenReading = token.getReading();
            if (tokenReading != null && !"*".equals(tokenReading)) {
                reading.append(katakanaToHiragana(tokenReading));
            } else {
                reading.append(katakanaToHiragana(token.getSurface()));
            }
        }
        return reading.toString();
    }

    private static String katakanaToHiragana(String input) {
        StringBuilder sb = new StringBuilder(input.length());
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            if (c >= '\u30A1' && c <= '\u30F6') {
                sb.append((char) (c - 0x60));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private record SongFieldIds(String titleFieldId, String artistFieldId) {
    }

    /**
     * 公開フォームからのリアルタイム曲かぶりチェック。
     * 指定された曲と同じ曲が既に提出されているか確認する。
     * 同じ曲でも異なるiTunesトラックIDの場合も検出する（正規化タイトル比較）。
     */
    public PublicSongDuplicateCheckResponse checkSongDuplicate(
            Live live,
            PublicSongDuplicateCheckRequest request,
            UUID excludeSubmissionId) {

        List<SettingSheetSubmission> submissions = settingSheetSubmissionRepository
                .findAllByLiveIdOrderByCreatedAtDesc(live.getId());

        if (excludeSubmissionId != null) {
            submissions = submissions.stream()
                    .filter(s -> !s.getId().equals(excludeSubmissionId))
                    .toList();
        }

        if (submissions.isEmpty()) {
            return new PublicSongDuplicateCheckResponse(false, List.of());
        }

        SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);

        // 既存提出から曲を抽出
        List<ExtractedSong> allSongs = new ArrayList<>();
        for (SettingSheetSubmission submission : submissions) {
            PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService
                    .readSubmissionPayload(submission.getPayloadJson());
            allSongs.addAll(extractSongs(submission.getId(), submission.getRecordLabel(),
                    config.blocks(), payload.answers()));
        }

        if (allSongs.isEmpty()) {
            return new PublicSongDuplicateCheckResponse(false, List.of());
        }

        // iTunes リンクを読み込む
        List<UUID> submissionIds = submissions.stream().map(SettingSheetSubmission::getId).toList();
        List<ItunesTrackLink> allLinks = itunesTrackLinkRepository.findAllBySubmissionIdIn(submissionIds);

        // クエリ曲の正規化キー
        String queryNormalizedTitle = normalize(request.songTitle());
        String queryNormalizedArtist = normalize(request.songArtist());
        String queryItunesNormalizedTitle = request.itunesTitle() != null ? normalize(request.itunesTitle()) : null;
        String queryItunesNormalizedArtist = request.itunesArtist() != null ? normalize(request.itunesArtist()) : null;
        String queryReadingTitle = toReading(request.songTitle());

        List<PublicSongDuplicateCheckResponse.DuplicateMatch> matches = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();

        for (ExtractedSong song : allSongs) {
            String dedupeKey = song.submissionId + "|" + song.title + "|" + song.artist;
            if (!seen.add(dedupeKey)) {
                continue;
            }

            if (matchesSong(song, request, allLinks,
                    queryNormalizedTitle, queryNormalizedArtist,
                    queryItunesNormalizedTitle, queryItunesNormalizedArtist,
                    queryReadingTitle)) {
                matches.add(new PublicSongDuplicateCheckResponse.DuplicateMatch(
                        song.recordLabel, song.title, song.artist));
            }
        }

        return new PublicSongDuplicateCheckResponse(!matches.isEmpty(), matches);
    }

    private boolean matchesSong(
            ExtractedSong existing,
            PublicSongDuplicateCheckRequest query,
            List<ItunesTrackLink> allLinks,
            String queryNormalizedTitle,
            String queryNormalizedArtist,
            String queryItunesNormalizedTitle,
            String queryItunesNormalizedArtist,
            String queryReadingTitle) {

        String existingNormalizedTitle = normalize(existing.title);
        String existingNormalizedArtist = normalize(existing.artist);

        // 1. 正規化タイトル+アーティストが完全一致
        if (queryNormalizedTitle.equals(existingNormalizedTitle)
                && queryNormalizedArtist.equals(existingNormalizedArtist)) {
            return true;
        }

        // 2. 正規化タイトルのみ一致（アーティスト名表記揺れ対策）
        if (!queryNormalizedTitle.isEmpty() && queryNormalizedTitle.equals(existingNormalizedTitle)) {
            return true;
        }

        // 3. 読み仮名一致（漢字/ひらがな表記揺れ対策）
        if (!queryReadingTitle.isEmpty()) {
            String existingReading = toReading(existing.title);
            if (queryReadingTitle.equals(existingReading)) {
                return true;
            }
        }

        // 4. iTunes トラックID一致
        if (query.itunesTrackId() != null && !query.itunesTrackId().isBlank()) {
            for (ItunesTrackLink link : allLinks) {
                if (link.getSubmission().getId().equals(existing.submissionId)
                        && query.itunesTrackId().equals(link.getItunesTrackId())) {
                    return true;
                }
            }
        }

        // 5. iTunes 正規化タイトル+アーティスト一致（異なるトラックIDでも同じ曲名なら検出）
        if (queryItunesNormalizedTitle != null && !queryItunesNormalizedTitle.isEmpty()) {
            for (ItunesTrackLink link : allLinks) {
                if (!link.getSubmission().getId().equals(existing.submissionId)) {
                    continue;
                }
                String linkNormalizedTitle = normalize(link.getItunesTitle());
                String linkNormalizedArtist = normalize(link.getItunesArtist());
                if (queryItunesNormalizedTitle.equals(linkNormalizedTitle)
                        && (queryItunesNormalizedArtist == null
                                || queryItunesNormalizedArtist.equals(linkNormalizedArtist))) {
                    return true;
                }
            }
        }

        return false;
    }

    private record ExtractedSong(UUID submissionId, String recordLabel, String title, String artist) {
        String normalizedKey() {
            return normalize(title) + "|" + normalize(artist);
        }

        String readingKey() {
            return toReading(title) + "|" + toReading(artist);
        }
    }
}

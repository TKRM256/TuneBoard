package jp.tubeboard.features.tenants.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DemoTenantSeedService {

    private static final List<DemoTenantDefinition> DEMO_TENANTS = List.of(
            new DemoTenantDefinition("デモサークル", List.of(
                    new DemoLiveDefinition("春ライブ 2026", "学内ホール", 14, 7, LiveStatus.PUBLISHED,
                            16, 0),
                    new DemoLiveDefinition("新歓ライブ 2026", "第一音楽スタジオ", 28, 18,
                            LiveStatus.PUBLISHED, 14, 4),
                    new DemoLiveDefinition("卒業ライブ 2025", "市民会館 小ホール", -30, -40,
                            LiveStatus.CLOSED, 10, 8))),
            new DemoTenantDefinition("コピーバンド研究会", List.of(
                    new DemoLiveDefinition("夏ライブ 2026", "リハーサルスタジオ A", 45, 30,
                            LiveStatus.PUBLISHED, 12, 2),
                    new DemoLiveDefinition("学祭前夜祭 2026", "野外ステージ", 60, 40,
                            LiveStatus.PUBLISHED, 10, 6),
                    new DemoLiveDefinition("冬ライブ 2025", "ライブハウス WEST", -75, -90,
                            LiveStatus.CLOSED, 8, 10))),
            new DemoTenantDefinition("合同ライブ運営チーム", List.of(
                    new DemoLiveDefinition("合同フェス 2026", "中央ホール", 90, 65,
                            LiveStatus.PUBLISHED, 8, 1),
                    new DemoLiveDefinition("アコースティックナイト 2026", "カフェラウンジ", 120,
                            95, LiveStatus.PUBLISHED, 6, 5))));

    private static final List<String> BAND_PREFIXES = List.of(
            "Blue", "Neon", "Moon", "Echo", "Lunar", "Sunset", "Circuit", "Parallel", "Harbor",
            "Orbit", "Signal", "Velvet");

    private static final List<String> BAND_SUFFIXES = List.of(
            "Groove", "Letters", "Canvas", "Notes", "Drivers", "Junction", "Palette", "Voltage",
            "Garden", "Factory", "Chime", "Transit");

    private static final List<SongSeed> SONG_POOL = List.of(
            new SongSeed("夏祭り", "Whiteberry"),
            new SongSeed("リライト", "ASIAN KUNG-FU GENERATION"),
            new SongSeed("天体観測", "BUMP OF CHICKEN"),
            new SongSeed("風吹けば恋", "チャットモンチー"),
            new SongSeed("群青日和", "東京事変"),
            new SongSeed("小さな恋のうた", "MONGOL800"),
            new SongSeed("シャングリラ", "チャットモンチー"),
            new SongSeed("GO!!!", "FLOW"),
            new SongSeed("完全感覚Dreamer", "ONE OK ROCK"),
            new SongSeed("Pretender", "Official髭男dism"),
            new SongSeed("丸ノ内サディスティック", "椎名林檎"),
            new SongSeed("secret base", "ZONE"),
            new SongSeed("ブルーバード", "いきものがかり"),
            new SongSeed("君の知らない物語", "supercell"),
            new SongSeed("ないものねだり", "KANA-BOON"),
            new SongSeed("明日も", "SHISHAMO"),
            new SongSeed("Teenager Forever", "King Gnu"),
            new SongSeed("ワタリドリ", "[Alexandros]"));

    private static final List<MemberSeed> MEMBER_POOL = List.of(
            new MemberSeed("アヤ", List.of("Vo")),
            new MemberSeed("ケン", List.of("Gt")),
            new MemberSeed("リョウ", List.of("Ba")),
            new MemberSeed("タクミ", List.of("Dr")),
            new MemberSeed("ミユ", List.of("Vo", "Cho")),
            new MemberSeed("ソラ", List.of("Gt", "Cho")),
            new MemberSeed("ハル", List.of("Ba")),
            new MemberSeed("レン", List.of("Dr")),
            new MemberSeed("ユナ", List.of("Vo", "Gt")),
            new MemberSeed("コウ", List.of("Gt")),
            new MemberSeed("シン", List.of("Ba")),
            new MemberSeed("ナオ", List.of("Dr")),
            new MemberSeed("サキ", List.of("Key", "Cho")),
            new MemberSeed("トワ", List.of("Gt")),
            new MemberSeed("ユウ", List.of("Ba", "Cho")),
            new MemberSeed("メイ", List.of("Perc", "Cho")));

    private static final List<List<String>> SONG_PART_PATTERNS = List.of(
            List.of("Vo", "Gt", "Ba", "Dr"),
            List.of("Vo", "Gt", "Ba", "Dr", "Key"),
            List.of("Vo", "Gt", "Gt", "Ba", "Dr"),
            List.of("Vo", "Gt", "Ba", "Dr", "Cho"));

    private final TenantsRepository tenantsRepository;
    private final UserTenantRepository userTenantRepository;
    private final LiveRepository liveRepository;
    private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
    private final SettingSheetConfigService settingSheetConfigService;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    @Transactional
    public void seedFor(User owner) {
        String defaultSettingsJson = settingSheetConfigService.writeSettingSheetConfig(
                settingSheetConfigService.defaultSettingSheetConfig());
        LocalDate baseDate = LocalDate.now();
        LocalDateTime baseDateTime = LocalDateTime.now();

        for (int tenantIndex = 0; tenantIndex < DEMO_TENANTS.size(); tenantIndex++) {
            DemoTenantDefinition tenantDefinition = DEMO_TENANTS.get(tenantIndex);
            Tenants tenant = tenantsRepository.save(Tenants.builder()
                    .name(tenantDefinition.name())
                    .user(owner)
                    .build());
            userTenantRepository.save(UserTenant.builder()
                    .user(owner)
                    .tenant(tenant)
                    .role(TenantRole.OWNER)
                    .build());

            seedLives(tenant, tenantIndex, tenantDefinition, defaultSettingsJson, baseDate, baseDateTime);
        }
    }

    private void seedLives(Tenants tenant, int tenantIndex, DemoTenantDefinition tenantDefinition,
            String defaultSettingsJson, LocalDate baseDate, LocalDateTime baseDateTime) {
        for (int liveIndex = 0; liveIndex < tenantDefinition.lives().size(); liveIndex++) {
            DemoLiveDefinition liveDefinition = tenantDefinition.lives().get(liveIndex);
            Live live = liveRepository.save(Live.builder()
                    .tenant(tenant)
                    .publicToken(UUID.randomUUID().toString())
                    .name(liveDefinition.name())
                    .date(baseDate.plusDays(liveDefinition.dateOffsetDays()))
                    .location(liveDefinition.location())
                    .deadlineAt(baseDateTime.plusDays(liveDefinition.deadlineOffsetDays()))
                    .status(liveDefinition.status())
                    .settingsJson(defaultSettingsJson)
                    .build());

            settingSheetSubmissionRepository.saveAll(
                    createSubmissions(live, tenantIndex, liveIndex, liveDefinition.songOffset(),
                            liveDefinition.submissionCount()));
        }
    }

    private List<SettingSheetSubmission> createSubmissions(Live live, int tenantIndex, int liveIndex,
            int songOffset, int submissionCount) {
        List<SettingSheetSubmission> submissions = new ArrayList<>();
        for (int submissionIndex = 0; submissionIndex < submissionCount; submissionIndex++) {
            String bandName = buildBandName(tenantIndex, liveIndex, submissionIndex);
            submissions.add(SettingSheetSubmission.builder()
                    .live(live)
                    .recordLabel(bandName)
                    .submissionStatus(SettingSheetConstants.SUBMISSION_STATUS)
                    .payloadJson(toPayloadJson(tenantIndex, liveIndex, submissionIndex, songOffset,
                            bandName))
                    .build());
        }
        return submissions;
    }

    private String buildBandName(int tenantIndex, int liveIndex, int submissionIndex) {
        String prefix = BAND_PREFIXES.get((tenantIndex * 3 + submissionIndex) % BAND_PREFIXES.size());
        String suffix = BAND_SUFFIXES.get((liveIndex * 5 + submissionIndex) % BAND_SUFFIXES.size());
        return "%s %s %02d".formatted(prefix, suffix, submissionIndex + 1);
    }

    private String toPayloadJson(int tenantIndex, int liveIndex, int submissionIndex, int songOffset,
            String bandName) {
        PublicSettingSheetSubmissionRequest payload = new PublicSettingSheetSubmissionRequest(List.of(
                new FieldAnswerRequest("band-name", List.of(bandName), List.of()),
                new FieldAnswerRequest("submission-status", List.of("完成"), List.of()),
                new FieldAnswerRequest("members", List.of(),
                        createMembers(tenantIndex, liveIndex, submissionIndex)),
                new FieldAnswerRequest("setlist", List.of(),
                        createSetlist(submissionIndex, songOffset))),
                null);
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("ダミーデータの作成に失敗しました", ex);
        }
    }

    private List<GroupItemRequest> createMembers(int tenantIndex, int liveIndex, int submissionIndex) {
        int memberCount = 4 + (submissionIndex % 3 == 0 ? 1 : 0);
        int baseOffset = tenantIndex * 11 + liveIndex * 7 + submissionIndex * 3;
        List<GroupItemRequest> members = new ArrayList<>();

        for (int memberIndex = 0; memberIndex < memberCount; memberIndex++) {
            MemberSeed member = MEMBER_POOL.get((baseOffset + memberIndex) % MEMBER_POOL.size());
            members.add(new GroupItemRequest(null, List.of(
                    new FieldAnswerRequest("member-name", List.of(member.name()), List.of()),
                    new FieldAnswerRequest("member-representative",
                            List.of(Boolean.toString(memberIndex == 0)), List.of()),
                    new FieldAnswerRequest("member-parts", member.parts(), List.of()))));
        }

        return members;
    }

    private List<GroupItemRequest> createSetlist(int submissionIndex, int songOffset) {
        int songCount = 2 + (submissionIndex % 2);
        List<GroupItemRequest> setlist = new ArrayList<>();

        for (int songIndex = 0; songIndex < songCount; songIndex++) {
            SongSeed song = SONG_POOL.get(resolveSongIndex(songOffset, submissionIndex, songIndex));
            List<String> parts = SONG_PART_PATTERNS
                    .get((submissionIndex + songIndex) % SONG_PART_PATTERNS.size());
            setlist.add(new GroupItemRequest("song-entry", List.of(
                    new FieldAnswerRequest("song", List.of(song.title(), song.artist()),
                            List.of()),
                    new FieldAnswerRequest("song-parts", parts, List.of()))));
        }

        return setlist;
    }

    private int resolveSongIndex(int songOffset, int submissionIndex, int setlistIndex) {
        if (setlistIndex == 0) {
            return (songOffset + (submissionIndex % 6)) % SONG_POOL.size();
        }
        return (songOffset + submissionIndex + setlistIndex * 4) % SONG_POOL.size();
    }

    private record DemoTenantDefinition(String name, List<DemoLiveDefinition> lives) {
    }

    private record DemoLiveDefinition(String name, String location, int dateOffsetDays, int deadlineOffsetDays,
            LiveStatus status, int submissionCount, int songOffset) {
    }

    private record SongSeed(String title, String artist) {
    }

    private record MemberSeed(String name, List<String> parts) {
    }
}
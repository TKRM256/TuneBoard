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
import jp.tubeboard.features.tenants.service.demo.DanceDemoForm;
import jp.tubeboard.features.tenants.service.demo.DemoForm;
import jp.tubeboard.features.tenants.service.demo.DemoStagePlots;
import jp.tubeboard.features.tenants.service.demo.DemoStagePlots.Kind;
import jp.tubeboard.features.tenants.service.demo.DemoVenueSeeder;
import jp.tubeboard.features.tenants.service.demo.FesDemoForm;
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
            // 既定のバンド向けフォーム
            new DemoTenantDefinition("デモサークル", null, List.of(
                    new DemoLiveDefinition("春ライブ 2026", "学内ホール", 14, 7, LiveStatus.PUBLISHED,
                            16, 0),
                    new DemoLiveDefinition("新歓ライブ 2026", "第一音楽スタジオ", 28, 18,
                            LiveStatus.PUBLISHED, 14, 4),
                    new DemoLiveDefinition("卒業ライブ 2025", "市民会館 小ホール", -30, -40,
                            LiveStatus.CLOSED, 10, 8))),
            // バンド以外の形のフォーム（ダンス発表会の出演申込）
            new DemoTenantDefinition("ダンス部 STEP", new DanceDemoForm(), List.of(
                    new DemoLiveDefinition("春の発表会 2026", "市民文化ホール", 45, 30,
                            LiveStatus.PUBLISHED, 12, 2),
                    new DemoLiveDefinition("学祭ステージ 2026", "野外ステージ", 60, 40,
                            LiveStatus.PUBLISHED, 10, 6),
                    new DemoLiveDefinition("冬公演 2025", "大学講堂", -75, -90,
                            LiveStatus.CLOSED, 8, 10))),
            // 入れ子の繰り返しや、演目ごとに書く項目が変わるフォーム（合同フェスのエントリー）
            new DemoTenantDefinition("合同ライブ運営チーム", new FesDemoForm(), List.of(
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

    /** 担当パートは既定のフォームの選択肢（Vocal / Guitar / Bass / Drum / Keyboard / その他）から選ぶ。 */
    private static final List<MemberSeed> MEMBER_POOL = List.of(
            new MemberSeed("アヤ", List.of("Vocal")),
            new MemberSeed("ケン", List.of("Guitar")),
            new MemberSeed("リョウ", List.of("Bass")),
            new MemberSeed("タクミ", List.of("Drum")),
            new MemberSeed("ミユ", List.of("Vocal")),
            new MemberSeed("ソラ", List.of("Guitar", "Vocal")),
            new MemberSeed("ハル", List.of("Bass")),
            new MemberSeed("レン", List.of("Drum")),
            new MemberSeed("ユナ", List.of("Vocal", "Guitar")),
            new MemberSeed("コウ", List.of("Guitar")),
            new MemberSeed("シン", List.of("Bass")),
            new MemberSeed("ナオ", List.of("Drum")),
            new MemberSeed("サキ", List.of("Keyboard", "Vocal")),
            new MemberSeed("トワ", List.of("Guitar")),
            new MemberSeed("ユウ", List.of("Bass", "Vocal")),
            new MemberSeed("メイ", List.of("その他", "Vocal")));

    /** 曲ごとの使うパートは既定のフォームの選択肢から選ぶ。 */
    private static final List<List<String>> SONG_PART_PATTERNS = List.of(
            List.of("Vocal", "Marshall", "Bass", "Drum"),
            List.of("Vocal", "Jazzchorus", "Bass", "Drum", "電子ピアノ"),
            List.of("Vocal", "Marshall", "Jazzchorus", "Bass", "Drum"),
            List.of("Vocal", "Marshall", "Bass", "Drum", "持ち込みシンセ"));

    private static final List<String> PA_NOTES = List.of(
            "イントロのリバーブ多めでお願いします",
            "ボーカルにディレイを軽くかけてください",
            "Aメロは音量控えめ、サビでドンと上げてください",
            "ベースのローを少し抑えめにお願いします",
            "ドラムはキックを前に出してください",
            "アコギは1本目のマイクを使います");

    private static final List<String> LIGHT_NOTES = List.of(
            "サビは赤系で爆発的に",
            "イントロは青と白のスポット中心で",
            "Bメロから徐々に明るく",
            "ラスサビは虹色で派手に",
            "落ちサビは暗めで青ピンスポ");

    private static final List<String> SONG_NOTES = List.of(
            "間奏でメンバーチェンジあり",
            "曲途中でMC挟みます",
            "イヤモニ使用",
            "アンコール対応あり",
            "");

    private final TenantsRepository tenantsRepository;
    private final UserTenantRepository userTenantRepository;
    private final LiveRepository liveRepository;
    private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
    private final SettingSheetConfigService settingSheetConfigService;
    private final DemoVenueSeeder demoVenueSeeder;
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

            String settingsJson = tenantDefinition.form() == null ? defaultSettingsJson
                    : tenantDefinition.form().settingsJson();
            seedLives(tenant, tenantIndex, tenantDefinition, settingsJson, baseDate, baseDateTime);
        }
    }

    private void seedLives(Tenants tenant, int tenantIndex, DemoTenantDefinition tenantDefinition,
            String settingsJson, LocalDate baseDate, LocalDateTime baseDateTime) {
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
                    .settingsJson(settingsJson)
                    .build());

            settingSheetSubmissionRepository.saveAll(tenantDefinition.form() == null
                    ? createSubmissions(live, tenantIndex, liveIndex, liveDefinition.songOffset(),
                            liveDefinition.submissionCount())
                    : createFormSubmissions(live, tenantDefinition.form(), liveIndex,
                            liveDefinition.submissionCount()));

            // ステージ配置図はどのライブにも、会場書式は各テナントの最初のライブにだけ入れる
            Kind kind = tenantDefinition.form() == null ? Kind.BAND : tenantDefinition.form().stageKind();
            demoVenueSeeder.seedStagePlot(live, kind);
            if (liveIndex == 0) {
                demoVenueSeeder.seedVenueForm(live, kind);
            }
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

    private List<SettingSheetSubmission> createFormSubmissions(Live live, DemoForm form, int liveIndex,
            int submissionCount) {
        List<SettingSheetSubmission> submissions = new ArrayList<>();
        for (int index = 0; index < submissionCount; index++) {
            submissions.add(SettingSheetSubmission.builder()
                    .live(live)
                    .recordLabel(form.recordLabel(liveIndex, index))
                    .submissionStatus(SettingSheetConstants.SUBMISSION_STATUS)
                    .payloadJson(toJson(form.payload(liveIndex, index)))
                    .build());
        }
        return submissions;
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("ダミーデータの作成に失敗しました", ex);
        }
    }

    private String buildBandName(int tenantIndex, int liveIndex, int submissionIndex) {
        String prefix = BAND_PREFIXES.get((tenantIndex * 3 + submissionIndex) % BAND_PREFIXES.size());
        String suffix = BAND_SUFFIXES.get((liveIndex * 5 + submissionIndex) % BAND_SUFFIXES.size());
        return "%s %s %02d".formatted(prefix, suffix, submissionIndex + 1);
    }

    private static final List<String> BAND_NOTES = List.of(
            "リハ希望: 早めにお願いします",
            "セッティング転換時にメンバー入れ替えあり",
            "BGM入退場あり (担当者と要相談)",
            "アンコールあり",
            "");

    private String toPayloadJson(int tenantIndex, int liveIndex, int submissionIndex, int songOffset,
            String bandName) {
        String detail = BAND_NOTES.get((tenantIndex + liveIndex + submissionIndex) % BAND_NOTES.size());
        PublicSettingSheetSubmissionRequest payload = new PublicSettingSheetSubmissionRequest(List.of(
                new FieldAnswerRequest("band-name", List.of(bandName), List.of()),
                new FieldAnswerRequest("submission-status", List.of("完成"), List.of()),
                new FieldAnswerRequest("detail", detail.isEmpty() ? List.of() : List.of(detail), List.of()),
                new FieldAnswerRequest("members", List.of(),
                        createMembers(tenantIndex, liveIndex, submissionIndex)),
                new FieldAnswerRequest("setlist", List.of(),
                        createSetlist(submissionIndex, songOffset)),
                new FieldAnswerRequest("stage-plot",
                        List.of(DemoStagePlots.value(Kind.BAND, tenantIndex + liveIndex + submissionIndex)), List.of())),
                null);
        return toJson(payload);
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
            String paNote = PA_NOTES.get((submissionIndex * 2 + songIndex) % PA_NOTES.size());
            String lightNote = LIGHT_NOTES.get((submissionIndex + songIndex * 2) % LIGHT_NOTES.size());
            String otherNote = SONG_NOTES.get((submissionIndex + songIndex) % SONG_NOTES.size());
            setlist.add(new GroupItemRequest("song-entry", List.of(
                    new FieldAnswerRequest("song", List.of(song.title(), song.artist()), List.of()),
                    new FieldAnswerRequest("song-parts", parts, List.of()),
                    new FieldAnswerRequest("song-note-pa", List.of(paNote), List.of()),
                    new FieldAnswerRequest("song-note-light", List.of(lightNote), List.of()),
                    new FieldAnswerRequest("song-note-other",
                            otherNote.isEmpty() ? List.of() : List.of(otherNote), List.of()))));
        }

        return setlist;
    }

    private int resolveSongIndex(int songOffset, int submissionIndex, int setlistIndex) {
        if (setlistIndex == 0) {
            return (songOffset + (submissionIndex % 6)) % SONG_POOL.size();
        }
        return (songOffset + submissionIndex + setlistIndex * 4) % SONG_POOL.size();
    }

    /** form が null なら既定のバンド向けフォーム。 */
    private record DemoTenantDefinition(String name, DemoForm form, List<DemoLiveDefinition> lives) {
    }

    private record DemoLiveDefinition(String name, String location, int dateOffsetDays, int deadlineOffsetDays,
            LiveStatus status, int submissionCount, int songOffset) {
    }

    private record SongSeed(String title, String artist) {
    }

    private record MemberSeed(String name, List<String> parts) {
    }
}
package jp.tubeboard.features;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.model.SongDuplicateResult;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.repository.SongDuplicateResultRepository;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantInvitationRepository;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/** 複数ユーザーの同時操作で起きていた 500 / 偽の競合 / 削除の取り消しが再発しないことを確認する。 */
@IntegrationTest
@AutoConfigureMockMvc
class ConcurrentOperationsIntegrationTest {

    private static final int THREADS = 5;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TenantsRepository tenantsRepository;

    @Autowired
    private UserTenantRepository userTenantRepository;

    @Autowired
    private TenantInvitationRepository tenantInvitationRepository;

    @Autowired
    private LiveRepository liveRepository;

    @Autowired
    private SettingSheetSubmissionRepository submissionRepository;

    @Autowired
    private SongDuplicateResultRepository songDuplicateResultRepository;

    @Autowired
    private JwtTokenService jwtTokenService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    private Tenants tenant;
    private Live live;
    private String ownerToken;
    private String newcomerToken;

    @BeforeEach
    void setUp() {
        tenantInvitationRepository.deleteAll();
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        User owner = userRepository.save(User.builder().sub("owner-sub").email("owner@example.com").name("O").picture("").build());
        userRepository.save(User.builder().sub("new-sub").email("new@example.com").name("N").picture("").build());
        tenant = tenantsRepository.save(Tenants.builder().name("同時操作テナント").user(owner).build());
        userTenantRepository.save(UserTenant.builder().user(owner).tenant(tenant).role(TenantRole.OWNER).build());
        live = liveRepository.save(Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name("同時操作ライブ")
                .status(LiveStatus.PUBLISHED)
                .settingsJson("{}")
                .build());
        ownerToken = jwtTokenService.generateToken("owner-sub", "O", "owner@example.com", "");
        newcomerToken = jwtTokenService.generateToken("new-sub", "N", "new@example.com", "");
    }

    // 招待が残ると他のテストクラスの tenantsRepository.deleteAll() が外部キーで失敗する
    @AfterEach
    void tearDown() {
        tenantInvitationRepository.deleteAll();
    }

    @Test
    void 同じ招待を同時に受け入れても500にならず参加は1件だけ() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/tenants/{id}/invitations", tenant.getId())
                .header("Authorization", "Bearer " + ownerToken)
                .contentType(APPLICATION_JSON)
                .content("{\"role\":\"MEMBER\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(created.getResponse().getContentAsString()).get("token").asText();

        List<Integer> statuses = runConcurrently(() -> post("/api/invitations/{token}/accept", token)
                .header("Authorization", "Bearer " + newcomerToken));

        assertThat(statuses).allMatch(s -> s == 204 || s == 400);
        assertThat(statuses).filteredOn(s -> s == 204).hasSize(1);
        assertThat(userTenantRepository.findAllByTenantIdAndDeletedAtIsNull(tenant.getId())).hasSize(2);
    }

    @Test
    void 削除と復元をしても版は変わらず編集中の出演者はそのまま保存できる() throws Exception {
        JsonNode submission = submit("元のバンド");
        long version = submission.get("version").asLong();
        UUID id = UUID.fromString(submission.get("id").asText());

        mockMvc.perform(post("/api/lives/{live}/setting-sheet/submissions/{id}/delete", live.getId(), id)
                .header("Authorization", "Bearer " + ownerToken)).andExpect(status().isNoContent());
        mockMvc.perform(post("/api/lives/{live}/setting-sheet/submissions/{id}/restore", live.getId(), id)
                .header("Authorization", "Bearer " + ownerToken)).andExpect(status().isNoContent());

        assertThat(submissionRepository.findById(id).orElseThrow().getVersion()).isEqualTo(version);
        mockMvc.perform(put("/api/public/lives/{token}/setting-sheet/submissions/{id}", live.getPublicToken(), id)
                .param("baseVersion", String.valueOf(version))
                .contentType(APPLICATION_JSON)
                .content(payload("編集後のバンド")))
                .andExpect(status().isOk());
    }

    @Test
    void 出演者の保存中にゴミ箱へ移されても保存で削除が取り消されない() throws Exception {
        UUID id = UUID.fromString(submit("元のバンド").get("id").asText());
        TransactionTemplate performerTx = new TransactionTemplate(transactionManager);
        TransactionTemplate adminTx = new TransactionTemplate(transactionManager);
        adminTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // 出演者が読み込んだ後、保存する前に管理者がゴミ箱へ移してコミットする
        performerTx.executeWithoutResult(s -> {
            SettingSheetSubmission loaded = submissionRepository.findById(id).orElseThrow();
            adminTx.executeWithoutResult(s2 -> submissionRepository.updateDeletedAt(id, LocalDateTime.now()));
            loaded.setRecordLabel("出演者の編集");
            submissionRepository.saveAndFlush(loaded);
        });

        SettingSheetSubmission saved = submissionRepository.findById(id).orElseThrow();
        assertThat(saved.getRecordLabel()).isEqualTo("出演者の編集");
        assertThat(saved.getDeletedAt()).isNotNull();
    }

    @Test
    void 最初の曲かぶり計算が同時に走っても全て成功し結果が保存される() throws Exception {
        // API で提出すると非同期計算が別に結果行を作ってしまい、再計算自身が保存したかを確かめられないので直接保存する
        for (String band : List.of("バンドA", "バンドB")) {
            submissionRepository.save(SettingSheetSubmission.builder()
                    .live(live)
                    .recordLabel(band)
                    .submissionStatus(SettingSheetConstants.SUBMISSION_STATUS)
                    .payloadJson(payload(band))
                    .build());
        }

        List<Integer> statuses = runConcurrently(() -> post("/api/lives/{id}/songs/duplicates/refresh", live.getId())
                .header("Authorization", "Bearer " + ownerToken));

        assertThat(statuses).containsOnly(200);
        // live_id は一意なので、保存されていれば必ず1行
        assertThat(songDuplicateResultRepository.findByLiveId(live.getId())).isPresent();
    }

    @Test
    void 古い計算結果が後から保存されても画面には今の提出内容の結果が出る() throws Exception {
        submit("バンドA");
        submit("バンドB");
        mockMvc.perform(post("/api/lives/{id}/songs/duplicates/refresh", live.getId())
                .header("Authorization", "Bearer " + ownerToken)).andExpect(status().isOk());

        // 同時に走った非同期計算のうち、提出が揃う前の時点のものが最後に書き込んだ状態を作る
        SongDuplicateResult stored = songDuplicateResultRepository.findByLiveId(live.getId()).orElseThrow();
        stored.setResultJson("{\"totalDuplicateGroups\":0,\"groups\":[]}");
        stored.setSubmissionsFingerprint("stale");
        songDuplicateResultRepository.saveAndFlush(stored);

        mockMvc.perform(get("/api/lives/{id}/songs/duplicates", live.getId())
                .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDuplicateGroups").value(1));
        // 返すだけでなく、正しい結果で保存し直されていること
        assertThat(songDuplicateResultRepository.findByLiveId(live.getId()).orElseThrow().getSubmissionsFingerprint())
                .isNotEqualTo("stale");
    }

    private List<Integer> runConcurrently(Callable<RequestBuilder> request) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> futures = new ArrayList<>();
        for (int i = 0; i < THREADS; i++) {
            RequestBuilder builder = request.call();
            futures.add(pool.submit(() -> {
                start.await();
                return mockMvc.perform(builder).andReturn().getResponse().getStatus();
            }));
        }
        start.countDown();
        List<Integer> statuses = new ArrayList<>();
        for (Future<Integer> f : futures) {
            statuses.add(f.get());
        }
        pool.shutdown();
        return statuses;
    }

    private JsonNode submit(String band) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/public/lives/{token}/setting-sheet/submissions", live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(payload(band)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    /** settingsJson が "{}" のライブは既定フォームになるので、その必須項目を埋めた回答。 */
    private String payload(String band) {
        return """
                {"answers":[
                  {"fieldId":"band-name","values":["%s"]},
                  {"fieldId":"submission-status","values":["完成"]},
                  {"fieldId":"members","items":[{"answers":[{"fieldId":"member-name","values":["山田"]},{"fieldId":"member-parts","values":["Vocal"]}]}]},
                  {"fieldId":"setlist","items":[{"variantId":"song-entry","answers":[{"fieldId":"song","values":["天体観測","BUMP"]},{"fieldId":"song-parts","values":["Vocal"]}]}]}
                ]}
                """.formatted(band);
    }
}

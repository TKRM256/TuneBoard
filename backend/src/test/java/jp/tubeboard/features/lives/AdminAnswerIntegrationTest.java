package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/** 管理者だけが入力する項目と、演奏時間・配置図ブロックの扱い。 */
@IntegrationTest
@AutoConfigureMockMvc
class AdminAnswerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TenantsRepository tenantsRepository;
    @Autowired
    private UserTenantRepository userTenantRepository;
    @Autowired
    private LiveRepository liveRepository;
    @Autowired
    private SettingSheetSubmissionRepository submissionRepository;
    @Autowired
    private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();
    private static final LayoutResponse LAYOUT = new LayoutResponse("full", 1, false);

    private Live live;
    private String adminToken;
    private String memberToken;

    @BeforeEach
    void setUp() throws Exception {
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder().sub("aa-admin").email("aa-admin@example.com")
                .name("Admin").picture("").build());
        User member = userRepository.save(User.builder().sub("aa-member").email("aa-member@example.com")
                .name("Member").picture("").build());
        Tenants tenant = tenantsRepository.save(Tenants.builder().name("管理者入力テナント").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.ADMIN).build());
        userTenantRepository.save(UserTenant.builder().user(member).tenant(tenant).role(TenantRole.MEMBER).build());
        live = liveRepository.save(Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name("出順のあるライブ")
                .status(LiveStatus.PUBLISHED)
                .settingsJson(objectMapper.writeValueAsString(config()))
                .stagePlotJson("{\"palette\":[{\"id\":\"gt\",\"iconName\":\"guitar\",\"label\":\"Gt\","
                        + "\"nodes\":[[\"circle\",{\"cx\":\"12\",\"cy\":\"12\",\"r\":\"10\"}]]}]}")
                .build());
        adminToken = jwtTokenService.generateToken("aa-admin", "Admin", "aa-admin@example.com", "");
        memberToken = jwtTokenService.generateToken("aa-member", "Member", "aa-member@example.com", "");
    }

    @Test
    void 公開フォームに管理者入力の項目は出ない() throws Exception {
        mockMvc.perform(get("/api/public/lives/{token}", live.getPublicToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settingSheetConfig.blocks[*].id",
                        Matchers.not(Matchers.hasItem("order"))))
                .andExpect(jsonPath("$.settingSheetConfig.blocks[*].id", Matchers.hasItem("band")));
    }

    @Test
    void 出演者が管理者入力の項目を送ると弾く() throws Exception {
        mockMvc.perform(post("/api/public/lives/{token}/setting-sheet/submissions", live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(answers(Map.of("band", "Band A", "order", "1"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 管理者が入力しても出演者の版は進まず詳細と一覧に合成される() throws Exception {
        UUID submissionId = submit(Map.of("band", "Band A"));
        long version = submissionRepository.findById(submissionId).orElseThrow().getVersion();

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{sid}/admin-answers", live.getId(),
                submissionId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("answers",
                        List.of(Map.of("fieldId", "order", "values", List.of("3"), "items", List.of()))))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers[0].values[0]").value("3"));

        assertThat(submissionRepository.findById(submissionId).orElseThrow().getVersion()).isEqualTo(version);

        mockMvc.perform(get("/api/lives/{id}/setting-sheet/submissions/{sid}", live.getId(), submissionId)
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers[?(@.fieldId == 'order')].values[0]").value("3"));

        mockMvc.perform(get("/api/lives/{id}/setting-sheet/submissions/details", live.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].answers[?(@.fieldId == 'order')].values[0]").value("3"));

        // 出演者の公開 API からは管理者入力は見えない
        mockMvc.perform(get("/api/public/lives/{token}/setting-sheet/submissions/{sid}", live.getPublicToken(),
                submissionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers[*].fieldId", Matchers.not(Matchers.hasItem("order"))));

        // 出演者が古い版のまま更新しても競合にならない
        mockMvc.perform(put("/api/public/lives/{token}/setting-sheet/submissions/{sid}", live.getPublicToken(),
                submissionId)
                .param("baseVersion", String.valueOf(version))
                .contentType(APPLICATION_JSON)
                .content(answers(Map.of("band", "Band A2"))))
                .andExpect(status().isOk());
    }

    @Test
    void 管理者入力は送った項目だけを置き換え空にすると消える() throws Exception {
        UUID submissionId = submit(Map.of("band", "Band A"));
        saveAdmin(submissionId, "order", List.of("2")).andExpect(status().isOk());
        saveAdmin(submissionId, "part-of-day", List.of("夜の部"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers.length()").value(2));
        saveAdmin(submissionId, "order", List.of())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.answers.length()").value(1))
                .andExpect(jsonPath("$.answers[0].fieldId").value("part-of-day"));
    }

    @Test
    void 管理者入力も選択肢や形式を検証しメンバーは保存できない() throws Exception {
        UUID submissionId = submit(Map.of("band", "Band A"));
        saveAdmin(submissionId, "part-of-day", List.of("真夜中")).andExpect(status().isBadRequest());
        saveAdmin(submissionId, "band", List.of("書き換え")).andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{sid}/admin-answers", live.getId(),
                submissionId)
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("answers",
                        List.of(Map.of("fieldId", "order", "values", List.of("1"), "items", List.of()))))))
                .andExpect(status().isNotFound());
    }

    @Test
    void 演奏時間と配置図の形式を検証する() throws Exception {
        String plot = "{\"items\":[{\"id\":\"1\",\"paletteId\":\"gt\",\"label\":\"Gt 田中\",\"x\":0.4,\"y\":0.5}]}";
        submit(Map.of("band", "Band A", "duration", "3:45", "stage", plot));

        mockMvc.perform(post("/api/public/lives/{token}/setting-sheet/submissions", live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(answers(Map.of("band", "Band B", "duration", "3分45秒"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(Matchers.containsString("分:秒")));

        mockMvc.perform(post("/api/public/lives/{token}/setting-sheet/submissions", live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(answers(Map.of("band", "Band C", "stage",
                        "{\"items\":[{\"id\":\"1\",\"paletteId\":\"drum\",\"x\":0.4,\"y\":0.5}]}"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(Matchers.containsString("使えないアイコン")));
    }

    @Test
    void 配置図の値は一覧の名前に使わない() throws Exception {
        String plot = "{\"items\":[{\"id\":\"1\",\"paletteId\":\"gt\",\"label\":\"Gt\",\"x\":0.4,\"y\":0.5}]}";
        MvcResult result = mockMvc.perform(post("/api/public/lives/{token}/setting-sheet/submissions",
                live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(answers(Map.of("stage", plot))))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(result.getResponse().getContentAsString()).path("recordLabel").asText())
                .doesNotContain("items");
    }

    // ───────── helpers ─────────

    private org.springframework.test.web.servlet.ResultActions saveAdmin(UUID submissionId, String fieldId,
            List<String> values) throws Exception {
        return mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{sid}/admin-answers", live.getId(),
                submissionId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("answers",
                        List.of(Map.of("fieldId", fieldId, "values", values, "items", List.of()))))));
    }

    private UUID submit(Map<String, String> values) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/public/lives/{token}/setting-sheet/submissions",
                live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(answers(values)))
                .andExpect(status().isOk())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private String answers(Map<String, String> values) throws Exception {
        List<Map<String, Object>> answers = values.entrySet().stream()
                .map(e -> Map.<String, Object>of("fieldId", e.getKey(), "values", List.of(e.getValue()),
                        "items", List.of()))
                .toList();
        return objectMapper.writeValueAsString(Map.of("answers", answers));
    }

    private static SettingSheetConfigResponse config() {
        return new SettingSheetConfigResponse("フォーム", "", "送信", true, List.of(
                block("band", "SHORT_TEXT", "バンド名", List.of(), false),
                block("duration", "DURATION", "演奏時間", List.of(), false),
                block("stage", "STAGE_PLOT", "配置図", List.of(), false),
                block("order", "SHORT_TEXT", "出順", List.of(), true),
                block("part-of-day", "SINGLE_SELECT", "部", List.of("昼の部", "夜の部"), true)));
    }

    private static FormBlockResponse block(String id, String type, String label, List<String> options,
            boolean adminOnly) {
        return new FormBlockResponse(id, type, label, "", false, false, true, false, false, "outline", "plain",
                options, 0, "", "", "", List.of(), LAYOUT, null, "", List.of(), adminOnly);
    }
}

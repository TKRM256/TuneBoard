package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/** 2 人が同じ設定を読み込んで順に保存したとき、後の保存が先の変更を黙って消さないこと。 */
@IntegrationTest
@AutoConfigureMockMvc
class EditConflictIntegrationTest {

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

    private Live live;
    private String adminToken;
    private String otherAdminToken;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder().sub("ec-admin").email("ec-admin@example.com").name("A").picture("").build());
        User other = userRepository.save(User.builder().sub("ec-other").email("ec-other@example.com").name("B").picture("").build());
        Tenants tenant = tenantsRepository.save(Tenants.builder().name("競合テナント").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.ADMIN).build());
        userTenantRepository.save(UserTenant.builder().user(other).tenant(tenant).role(TenantRole.ADMIN).build());
        live = liveRepository.save(Live.builder().tenant(tenant).publicToken(UUID.randomUUID().toString())
                .name("競合ライブ").status(LiveStatus.PUBLISHED).settingsJson("{}").build());
        adminToken = jwtTokenService.generateToken("ec-admin", "A", "ec-admin@example.com", "");
        otherAdminToken = jwtTokenService.generateToken("ec-other", "B", "ec-other@example.com", "");
    }

    @Test
    void フォームの設定は読み込んだあとに他の人が保存していたら409で止まり内容は先の保存のまま() throws Exception {
        ObjectNode loadedByA = getJson("/api/lives/{id}/setting-sheet/config", adminToken);
        ObjectNode loadedByB = getJson("/api/lives/{id}/setting-sheet/config", otherAdminToken);
        assertThat(loadedByA.path("revision").asText()).isNotBlank().isEqualTo(loadedByB.path("revision").asText());
        assertThat(loadedByA.has("config")).isFalse();

        String savedRevision = saveConfig(adminToken, withRevision(loadedByA, "title", "Aのタイトル"), 200)
                .path("revision").asText();
        assertThat(savedRevision).isNotEqualTo(loadedByA.path("revision").asText());

        JsonNode conflict = saveConfig(otherAdminToken, withRevision(loadedByB, "description", "Bの説明"), 409);
        assertThat(conflict.path("message").asText()).contains("他の人がフォームの設定を更新しました");
        assertThat(getJson("/api/lives/{id}/setting-sheet/config", adminToken).path("title").asText()).isEqualTo("Aのタイトル");

        // 読み込み直した版で送れば保存でき、印を送らない古い画面からの保存も今までどおり通る
        ObjectNode reloaded = getJson("/api/lives/{id}/setting-sheet/config", otherAdminToken);
        saveConfig(otherAdminToken, withRevision(reloaded, "description", "Bの説明"), 200);
        ObjectNode withoutRevision = getJson("/api/lives/{id}/setting-sheet/config", otherAdminToken);
        withoutRevision.remove("revision");
        saveConfig(otherAdminToken, withoutRevision, 200);
    }

    @Test
    void PDF書式も他の人の保存のあとに古い版で保存すると409になる() throws Exception {
        JsonNode created = sendJson(post("/api/lives/{id}/pdf-layouts", live.getId()), adminToken,
                Map.of("name", "標準", "source", "BLANK"), 200);
        String layoutId = created.path("id").asText();
        String revision = created.path("revision").asText();
        assertThat(revision).isNotBlank();

        Map<String, Object> first = layoutBody("Aの書式", created.path("document"), revision);
        JsonNode saved = sendJson(put("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), layoutId), adminToken, first, 200);
        assertThat(saved.path("revision").asText()).isNotEqualTo(revision);

        Map<String, Object> stale = layoutBody("Bの書式", created.path("document"), revision);
        JsonNode conflict = sendJson(put("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), layoutId), otherAdminToken, stale, 409);
        assertThat(conflict.path("message").asText()).contains("他の人がこの書式を更新しました");

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), layoutId)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(jsonPath("$.name").value("Aの書式"));
    }

    @Test
    void ステージ設定も古い版で保存すると409になる() throws Exception {
        ObjectNode loaded = getJson("/api/lives/{id}/stage-plot", adminToken);
        String revision = loaded.path("revision").asText();
        Map<String, Object> body = new HashMap<>();
        body.put("aspectRatio", 2.0);
        body.put("iconScale", 0.1);
        body.put("palette", List.of());
        body.put("baseRevision", revision);
        sendJson(post("/api/lives/{id}/stage-plot", live.getId()), adminToken, body, 200);

        body.put("aspectRatio", 1.5);
        JsonNode conflict = sendJson(post("/api/lives/{id}/stage-plot", live.getId()), otherAdminToken, body, 409);
        assertThat(conflict.path("message").asText()).contains("他の人がステージ設定を更新しました");
    }

    private ObjectNode getJson(String url, String token) throws Exception {
        String body = mockMvc.perform(get(url, live.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return (ObjectNode) objectMapper.readTree(body);
    }

    private static ObjectNode withRevision(ObjectNode loaded, String field, String value) {
        ObjectNode copy = loaded.deepCopy();
        copy.put("baseRevision", copy.path("revision").asText());
        copy.remove("revision");
        copy.put(field, value);
        return copy;
    }

    private JsonNode saveConfig(String token, ObjectNode body, int expectedStatus) throws Exception {
        return sendJson(post("/api/lives/{id}/setting-sheet/config", live.getId()), token, body, expectedStatus);
    }

    private static Map<String, Object> layoutBody(String name, JsonNode document, String baseRevision) {
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("document", document);
        body.put("baseRevision", baseRevision);
        return body;
    }

    private JsonNode sendJson(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            String token, Object body, int expectedStatus) throws Exception {
        String response = mockMvc.perform(request
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }
}

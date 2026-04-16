package jp.tubeboard.features.tenants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

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
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

@IntegrationTest
@AutoConfigureMockMvc
class TenantsControllerIntegrationTest {

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
        private SettingSheetSubmissionRepository settingSheetSubmissionRepository;

        @Autowired
        private JwtTokenService jwtTokenService;

        private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

        @BeforeEach
        void setUp() {
                settingSheetSubmissionRepository.deleteAll();
                liveRepository.deleteAll();
                userTenantRepository.deleteAll();
                tenantsRepository.deleteAll();
                userRepository.deleteAll();
        }

        @Test
        void テナントを作成更新削除できる() throws Exception {
                String token = createAccessToken("tenant-user-sub");

                MvcResult createResult = mockMvc.perform(post("/api/tenants/create")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                {"name":"軽音サークル"}
                                                """))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.name").value("軽音サークル"))
                                .andReturn();

                UUID tenantId = UUID.fromString(objectMapper.readTree(createResult.getResponse().getContentAsString())
                                .path("id").asText());

                mockMvc.perform(get("/api/tenants/list")
                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].id").value(tenantId.toString()))
                                .andExpect(jsonPath("$[0].name").value("軽音サークル"))
                                .andExpect(jsonPath("$[0].role").value("OWNER"));

                mockMvc.perform(get("/api/tenants/get/{tenantId}", tenantId)
                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(tenantId.toString()))
                                .andExpect(jsonPath("$.name").value("軽音サークル"))
                                .andExpect(jsonPath("$.role").value("OWNER"));

                mockMvc.perform(post("/api/tenants/update")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                {"id":"%s","name":"新歓ライブ実行委員"}
                                                """.formatted(tenantId)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(tenantId.toString()))
                                .andExpect(jsonPath("$.name").value("新歓ライブ実行委員"));

                mockMvc.perform(post("/api/tenants/delete")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                {"id":"%s"}
                                                """.formatted(tenantId)))
                                .andExpect(status().isNoContent());

                Tenants deletedTenant = tenantsRepository.findById(tenantId).orElseThrow();
                assertThat(deletedTenant.getDeletedAt()).isNotNull();

                mockMvc.perform(get("/api/tenants/list")
                                .header("Authorization", "Bearer " + token))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$").isEmpty());
        }

        @Test
        void 不正なリクエストはバリデーションエラーを返す() throws Exception {
                String token = createAccessToken("tenant-user-sub");

                mockMvc.perform(post("/api/tenants/create")
                                .header("Authorization", "Bearer " + token)
                                .contentType(APPLICATION_JSON)
                                .content("""
                                                {"name":""}
                                                """))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("テナント名は必須です"))
                                .andExpect(jsonPath("$.fieldErrors.name").value("テナント名は必須です"));
        }

        private String createAccessToken(String sub) {
                userRepository.save(User.builder()
                                .sub(sub)
                                .email(sub + "@example.com")
                                .name("Tenant User")
                                .picture("")
                                .build());
                return jwtTokenService.generateToken(sub, "Tenant User", sub + "@example.com", "");
        }
}
package jp.tubeboard.features.tenants;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

@IntegrationTest
@AutoConfigureMockMvc
class TenantMembersControllerIntegrationTest {

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

    private User adminUser;
    private User memberUser;
    private User outsiderUser;
    private Tenants tenant;
    private String adminToken;
    private String memberToken;
    private String outsiderToken;

    @BeforeEach
    void setUp() {
        settingSheetSubmissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .sub("admin-sub")
                .email("admin@example.com")
                .name("Admin")
                .picture("")
                .build());

        memberUser = userRepository.save(User.builder()
                .sub("member-sub")
                .email("member@example.com")
                .name("Member")
                .picture("")
                .build());

        outsiderUser = userRepository.save(User.builder()
                .sub("outsider-sub")
                .email("outsider@example.com")
                .name("Outsider")
                .picture("")
                .build());

        tenant = tenantsRepository.save(Tenants.builder()
                .name("テストサークル")
                .user(adminUser)
                .build());

        userTenantRepository.save(UserTenant.builder()
                .user(adminUser)
                .tenant(tenant)
                .role(TenantRole.ADMIN)
                .build());

        userTenantRepository.save(UserTenant.builder()
                .user(memberUser)
                .tenant(tenant)
                .role(TenantRole.MEMBER)
                .build());

        adminToken = jwtTokenService.generateToken("admin-sub", "Admin", "admin@example.com", "");
        memberToken = jwtTokenService.generateToken("member-sub", "Member", "member@example.com", "");
        outsiderToken = jwtTokenService.generateToken("outsider-sub", "Outsider", "outsider@example.com", "");
    }

    // ==================== 一覧 ====================

    @Test
    void 管理者はメンバー一覧を取得できる() throws Exception {
        mockMvc.perform(get("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void メンバーもメンバー一覧を取得できる() throws Exception {
        mockMvc.perform(get("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void 非メンバーはメンバー一覧を取得できない() throws Exception {
        mockMvc.perform(get("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isNotFound());
    }

    // ==================== 追加 ====================

    @Test
    void 管理者はメンバーを追加できる() throws Exception {
        mockMvc.perform(post("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"outsider@example.com","role":"MEMBER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("outsider@example.com"))
                .andExpect(jsonPath("$.role").value("MEMBER"));
    }

    @Test
    void メンバーはメンバーを追加できない() throws Exception {
        mockMvc.perform(post("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"outsider@example.com","role":"MEMBER"}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void 既にメンバーのユーザーを追加するとエラーになる() throws Exception {
        mockMvc.perform(post("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"email":"member@example.com","role":"MEMBER"}
                                """))
                .andExpect(status().isBadRequest());
    }

    // ==================== 削除 ====================

    @Test
    void 管理者はメンバーを削除できる() throws Exception {
        mockMvc.perform(delete("/api/tenants/{tenantId}/members/{userId}", tenant.getId(), memberUser.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tenants/{tenantId}/members", tenant.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void メンバーはメンバーを削除できない() throws Exception {
        mockMvc.perform(delete("/api/tenants/{tenantId}/members/{userId}", tenant.getId(), adminUser.getId())
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void 管理者は自分自身を削除できない() throws Exception {
        mockMvc.perform(delete("/api/tenants/{tenantId}/members/{userId}", tenant.getId(), adminUser.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    // ==================== ロール変更 ====================

    @Test
    void 管理者はメンバーのロールを変更できる() throws Exception {
        mockMvc.perform(put("/api/tenants/{tenantId}/members/{userId}/role", tenant.getId(), memberUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"ADMIN"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void メンバーはロールを変更できない() throws Exception {
        mockMvc.perform(put("/api/tenants/{tenantId}/members/{userId}/role", tenant.getId(), adminUser.getId())
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"MEMBER"}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void 管理者は自分自身のロールを変更できない() throws Exception {
        mockMvc.perform(put("/api/tenants/{tenantId}/members/{userId}/role", tenant.getId(), adminUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(APPLICATION_JSON)
                        .content("""
                                {"role":"MEMBER"}
                                """))
                .andExpect(status().isBadRequest());
    }
}

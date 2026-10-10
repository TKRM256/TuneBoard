package jp.tubeboard.features.lives;

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

/** ライブ管理 API の入力チェック（500 にせず 400 で理由を返すこと）を確認する。 */
@IntegrationTest
@AutoConfigureMockMvc
class LiveValidationIntegrationTest {

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

    private Tenants tenant;
    private Live live;
    private String token;

    @BeforeEach
    void setUp() {
        settingSheetSubmissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
                .sub("validation-sub").email("validation@example.com").name("V").picture("").build());
        tenant = tenantsRepository.save(Tenants.builder().name("検証テナント").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.OWNER).build());
        live = liveRepository.save(Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name("検証ライブ")
                .status(LiveStatus.PUBLISHED)
                .settingsJson("{}")
                .build());
        token = jwtTokenService.generateToken("validation-sub", "V", "validation@example.com", "");
    }

    @Test
    void 回答締切が開催日より後ならライブを作成できない() throws Exception {
        mockMvc.perform(post("/api/lives/create")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content("""
                        {"tenantId":"%s","name":"夏ライブ","date":"2026-08-01","deadlineAt":"2026-08-02T00:00:00"}
                        """.formatted(tenant.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.deadlineAt").value("回答締切は開催日以前にしてください"));
    }

    @Test
    void 回答締切が開催日当日ならライブを更新できる() throws Exception {
        mockMvc.perform(post("/api/lives/update")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content("""
                        {"id":"%s","name":"検証ライブ","date":"2026-08-01","deadlineAt":"2026-08-01T23:00:00","status":"PUBLISHED"}
                        """.formatted(live.getId())))
                .andExpect(status().isOk());
    }

    @Test
    void pageやelementsが無いPDFレイアウトは保存できない() throws Exception {
        mockMvc.perform(post("/api/lives/{id}/pdf-canvas", live.getId())
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content("{\"canvas\":{\"foo\":1}}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void ライブIDがUUIDでなければ400になる() throws Exception {
        mockMvc.perform(get("/api/lives/not-a-uuid").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }
}

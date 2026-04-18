package jp.tubeboard.features.tenants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import jp.tubeboard.config.OAuth2TestConfig;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

@SpringBootTest(properties = "app.dev.seed-dummy=true")
@Import(OAuth2TestConfig.class)
@AutoConfigureMockMvc
class TenantDemoSeedIntegrationTest {

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

    @BeforeEach
    void setUp() {
        settingSheetSubmissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void seedDummy有効時は大量のデモデータを一度だけ投入する() throws Exception {
        String token = createAccessToken("dummy-seed-user-sub");

        mockMvc.perform(get("/api/tenants/list")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].role").value("OWNER"));

        assertThat(tenantsRepository.count()).isEqualTo(3);
        assertThat(userTenantRepository.count()).isEqualTo(3);
        assertThat(liveRepository.count()).isEqualTo(8);
        assertThat(settingSheetSubmissionRepository.count()).isEqualTo(84);

        mockMvc.perform(get("/api/tenants/list")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        assertThat(tenantsRepository.count()).isEqualTo(3);
        assertThat(liveRepository.count()).isEqualTo(8);
        assertThat(settingSheetSubmissionRepository.count()).isEqualTo(84);
    }

    private String createAccessToken(String sub) {
        userRepository.save(User.builder()
                .sub(sub)
                .email(sub + "@example.com")
                .name("Dummy Seed User")
                .picture("")
                .build());
        return jwtTokenService.generateToken(sub, "Dummy Seed User", sub + "@example.com", "");
    }
}
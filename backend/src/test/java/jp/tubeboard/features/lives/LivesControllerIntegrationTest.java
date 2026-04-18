package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
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
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

@IntegrationTest
@AutoConfigureMockMvc
class LivesControllerIntegrationTest {

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

    private User adminUser;
    private User memberUser;
    private Tenants tenant;
    private Live live;
    private SettingSheetSubmission submission;
    private String adminToken;
    private String memberToken;

    @BeforeEach
    void setUp() {
        settingSheetSubmissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        adminUser = userRepository.save(User.builder()
                .sub("live-admin-sub")
                .email("live-admin@example.com")
                .name("Live Admin")
                .picture("")
                .build());

        memberUser = userRepository.save(User.builder()
                .sub("live-member-sub")
                .email("live-member@example.com")
                .name("Live Member")
                .picture("")
                .build());

        tenant = tenantsRepository.save(Tenants.builder()
                .name("ライブ管理テナント")
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

        live = liveRepository.save(Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name("新歓ライブ")
                .status(LiveStatus.PUBLISHED)
                .settingsJson("{}")
                .build());

        submission = settingSheetSubmissionRepository.save(SettingSheetSubmission.builder()
                .live(live)
                .recordLabel("Band A")
                .submissionStatus("submitted")
                .payloadJson("{\"answers\":[]}")
                .build());

        adminToken = jwtTokenService.generateToken("live-admin-sub", "Live Admin", "live-admin@example.com", "");
        memberToken = jwtTokenService.generateToken("live-member-sub", "Live Member", "live-member@example.com", "");
    }

    @Test
    void 管理者は提出済みセッティングシートを削除復元完全削除できる() throws Exception {
        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/delete",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(settingSheetSubmissionRepository.findById(submission.getId()).orElseThrow().getDeletedAt())
                .isNotNull();

        mockMvc.perform(get("/api/lives/{id}/setting-sheet/submissions/trash", live.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/restore",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(settingSheetSubmissionRepository.findById(submission.getId()).orElseThrow().getDeletedAt())
                .isNull();

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/delete",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/purge",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(settingSheetSubmissionRepository.findById(submission.getId())).isEmpty();
    }

    @Test
    void メンバーは提出済みセッティングシートを削除できない() throws Exception {
        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/delete",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());

        assertThat(settingSheetSubmissionRepository.findById(submission.getId()).orElseThrow().getDeletedAt())
                .isNull();
    }

    @Test
    void メンバーは提出済みセッティングシートのゴミ箱一覧を取得できない() throws Exception {
        submission.markDeleted();
        settingSheetSubmissionRepository.save(submission);

        mockMvc.perform(get("/api/lives/{id}/setting-sheet/submissions/trash", live.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void メンバーは提出済みセッティングシートを復元できない() throws Exception {
        submission.markDeleted();
        settingSheetSubmissionRepository.save(submission);

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/restore",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());

        assertThat(settingSheetSubmissionRepository.findById(submission.getId()).orElseThrow().getDeletedAt())
                .isNotNull();
    }

    @Test
    void メンバーは提出済みセッティングシートを完全削除できない() throws Exception {
        submission.markDeleted();
        settingSheetSubmissionRepository.save(submission);

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/purge",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());

        assertThat(settingSheetSubmissionRepository.findById(submission.getId())).isPresent();
    }

    @Test
    void ライブのゴミ箱一覧は管理者のみ取得できる() throws Exception {
        live.markDeleted();
        liveRepository.save(live);

        mockMvc.perform(get("/api/lives/tenant/{tenantId}/trash", tenant.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(get("/api/lives/tenant/{tenantId}/trash", tenant.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
    }
}
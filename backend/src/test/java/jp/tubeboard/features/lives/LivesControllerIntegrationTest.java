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
    void 式プレビューは実際の提出データで評価される() throws Exception {
        givenLiveWithMembersGroup();

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/preview-expression",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"expression\":\"${joinField(groups['members'], 'member-name', ', ')}\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("Alice, Bob"));
    }

    @Test
    void 行ごとに評価される式は見本行を束縛してプレビューできる() throws Exception {
        givenLiveWithMembersGroup();

        // value / item は描画時に行ごとへ束縛されるので、groupId・fieldId の指定で 1 件目を見本にする
        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/preview-expression",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"expression\":\"${value} さん\",\"groupId\":\"members\",\"fieldId\":\"member-name\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("Alice さん"));
    }

    @Test
    void 式プレビューは評価エラーをメッセージとして返す() throws Exception {
        givenLiveWithMembersGroup();

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/submissions/{submissionId}/preview-expression",
                live.getId(), submission.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"expression\":\"${joinField(}\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(org.hamcrest.Matchers.containsString("[")));
    }

    @Test
    void 式は全提出に対してまとめて評価できる() throws Exception {
        givenLiveWithMembersGroup();

        // 同じライブに、出演者が 1 人だけの提出を追加する
        settingSheetSubmissionRepository.save(SettingSheetSubmission.builder()
                .live(live)
                .recordLabel("Band B")
                .submissionStatus("submitted")
                .payloadJson("""
                        {"answers":[{"fieldId":"members","values":[],"items":[
                          {"variantId":"","answers":[{"fieldId":"member-name","values":["Carol"],"items":[]}]}]}]}
                        """)
                .build());

        mockMvc.perform(post("/api/lives/{id}/setting-sheet/preview-expression", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content("{\"expression\":\"${joinField(groups['members'], 'member-name', ', ')}\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.recordLabel=='Band A')].result").value("Alice, Bob"))
                .andExpect(jsonPath("$[?(@.recordLabel=='Band B')].result").value("Carol"))
                .andExpect(jsonPath("$[0].error").value(false));
    }

    /** 出演者グループを 1 つ持つフォーム定義と、2 件回答済みの提出を用意する。 */
    private void givenLiveWithMembersGroup() {
        live.setSettingsJson("""
                {"title":"t","description":"","submitButtonLabel":"送信","publicSubmissionEnabled":true,
                 "blocks":[{"id":"members","type":"REPEATABLE_GROUP","label":"出演者","description":"",
                   "hidden":false,"publicVisible":false,"required":false,"collapsible":false,
                   "appearance":"subtle","itemAppearance":"outline","options":[],"minItems":0,
                   "addButtonLabel":"","entryTitle":"","titleSourceFieldId":"",
                   "fields":[{"id":"member-name","type":"SHORT_TEXT","label":"氏名","description":"",
                     "hidden":false,"publicVisible":false,"required":false,"collapsible":false,
                     "appearance":"outline","itemAppearance":"plain","options":[],"minItems":0,
                     "addButtonLabel":"","entryTitle":"","titleSourceFieldId":"","fields":[],
                     "layout":{"width":"half","optionColumns":1,"optionFitContent":false},
                     "optionSource":null,"duplicateDetectionRole":"","variants":[]}],
                   "layout":{"width":"full","optionColumns":1,"optionFitContent":false},
                   "optionSource":null,"duplicateDetectionRole":"","variants":[]}]}
                """);
        liveRepository.save(live);

        submission.setPayloadJson("""
                {"answers":[{"fieldId":"members","values":[],"items":[
                  {"variantId":"","answers":[{"fieldId":"member-name","values":["Alice"],"items":[]}]},
                  {"variantId":"","answers":[{"fieldId":"member-name","values":["Bob"],"items":[]}]}]}]}
                """);
        settingSheetSubmissionRepository.save(submission);
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
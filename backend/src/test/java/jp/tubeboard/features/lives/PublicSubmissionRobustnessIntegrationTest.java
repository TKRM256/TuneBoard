package jp.tubeboard.features.lives;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.service.config.FormBuilderHelper;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/**
 * 公開提出 API が壊れた入力や、フォーム設定の変更後に残った古いデータで 500 にならないことを確認する。
 */
@IntegrationTest
@AutoConfigureMockMvc
class PublicSubmissionRobustnessIntegrationTest {

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
    private final FormBuilderHelper form = new FormBuilderHelper();

    @BeforeEach
    void setUp() {
        settingSheetSubmissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void 先頭の回答が255文字を超えても提出でき一覧名は切り詰められる() throws Exception {
        Live live = createLive(List.of(form.longTextBlock("detail", "備考", true, form.layoutFull(1))));

        mockMvc.perform(submit(live, """
                {"answers":[{"fieldId":"detail","values":["%s"]}]}
                """.formatted("あ".repeat(300))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordLabel").value("あ".repeat(255)));
    }

    @Test
    void 一覧名の切り詰めで絵文字を途中で切らない() throws Exception {
        Live live = createLive(List.of(form.longTextBlock("detail", "備考", true, form.layoutFull(1))));

        // 255 文字目がサロゲートペアの前半に当たる入力
        mockMvc.perform(submit(live, """
                {"answers":[{"fieldId":"detail","values":["%s😀続き"]}]}
                """.formatted("a".repeat(254))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordLabel").value("a".repeat(254)));
    }

    @Test
    void 配列内のnull要素は無視される() throws Exception {
        Live live = createLive(List.of(
                form.textBlock("band-name", "バンド名", true, form.layoutFull(1)),
                form.groupBlock("members", "出演者", "", false, false, 0, "追加", "出演者", "", form.layoutFull(1),
                        List.of(form.textBlock("member-name", "氏名", false, form.layoutFull(1))))));

        mockMvc.perform(submit(live, """
                {"answers":[null,{"fieldId":"band-name","values":["Band"]},
                  {"fieldId":"members","items":[null,{"answers":[null]}]}],
                 "itunesLinks":[null]}
                """))
                .andExpect(status().isOk());
    }

    @Test
    void 存在しないvariantIdの項目は先頭バリエーションとして検証される() throws Exception {
        Live live = createLive(List.of(setlist(true)));

        mockMvc.perform(submit(live, """
                {"answers":[{"fieldId":"setlist","items":[{"variantId":"zzz","answers":[]}]}]}
                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors['answers.setlist.items[0].answers.song']").exists());
    }

    @Test
    void バリエーション削除後も古いvariantIdの提出を更新できる() throws Exception {
        Live live = createLive(List.of(setlist(true)));
        UUID id = submitAndGetId(live, """
                {"answers":[{"fieldId":"setlist","items":[{"variantId":"mc","answers":[{"fieldId":"mc-note","values":["挨拶"]}]}]}]}
                """);

        // 管理者が MC バリエーションを消した。画面は先頭の「曲」として表示し、そのフィールドで送り直す
        updateConfig(live, List.of(setlist(false)));
        mockMvc.perform(update(live, id, """
                {"answers":[{"fieldId":"setlist","items":[{"variantId":"mc","answers":[{"fieldId":"song","values":["天体観測","BUMP"]}]}]}]}
                """))
                .andExpect(status().isOk());
    }

    @Test
    void バリエーション削除後の古い提出の曲も曲かぶり検出に含まれる() throws Exception {
        Live live = createLive(List.of(setlist(true)));
        submitAndGetId(live, """
                {"answers":[{"fieldId":"setlist","items":[{"variantId":"song","answers":[{"fieldId":"song","values":["天体観測","BUMP"]}]}]}]}
                """);
        UUID old = submitAndGetId(live, """
                {"answers":[{"fieldId":"setlist","items":[{"variantId":"mc","answers":[{"fieldId":"mc-note","values":["挨拶"]}]}]}]}
                """);

        updateConfig(live, List.of(setlist(false)));
        mockMvc.perform(update(live, old, """
                {"answers":[{"fieldId":"setlist","items":[{"variantId":"mc","answers":[{"fieldId":"song","values":["天体観測","BUMP"]}]}]}]}
                """))
                .andExpect(status().isOk());

        // 提出の検証と同じ規則で古い variantId を解釈できていれば、2件の「天体観測」がかぶりとして出る
        String token = jwtTokenService.generateToken("robust-sub", "R", "robust@example.com", "");
        mockMvc.perform(post("/api/lives/{id}/songs/duplicates/refresh", live.getId())
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDuplicateGroups").value(1));
    }

    @Test
    void 通常グループをバリエーション付きに変えた後も古い提出を更新できる() throws Exception {
        FormBlockResponse memberName = form.textBlock("member-name", "氏名", true, form.layoutFull(1));
        Live live = createLive(List.of(form.groupBlock("members", "出演者", "", true, false, 0, "追加", "出演者", "",
                form.layoutFull(1), List.of(memberName))));
        String body = """
                {"answers":[{"fieldId":"members","items":[{"answers":[{"fieldId":"member-name","values":["山田"]}]}]}]}
                """;
        UUID id = submitAndGetId(live, body);

        updateConfig(live, List.of(form.variantGroupBlock("members", "出演者", "", true, false, 0, "追加", "出演者", "",
                form.layoutFull(1), List.of(form.variant("player", "奏者", List.of(memberName))))));
        mockMvc.perform(update(live, id, body)).andExpect(status().isOk());
    }

    @Test
    void 提出IDがUUIDでなければ400になる() throws Exception {
        Live live = createLive(List.of(form.textBlock("band-name", "バンド名", true, form.layoutFull(1))));

        mockMvc.perform(put("/api/public/lives/{token}/setting-sheet/submissions/not-a-uuid", live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content("{\"answers\":[]}"))
                .andExpect(status().isBadRequest());
    }

    /** 曲とMCのバリエーションを持つセットリスト。withMc=false は MC を削除した後の設定。 */
    private FormBlockResponse setlist(boolean withMc) {
        var song = form.variant("song", "曲", List.of(form.songBlock("song", "楽曲", true, form.layoutFull(1))));
        var mc = form.variant("mc", "MC", List.of(form.longTextBlock("mc-note", "内容", false, form.layoutFull(1))));
        return form.variantGroupBlock("setlist", "セットリスト", "", true, false, 0, "追加", "曲", "",
                form.layoutFull(1), withMc ? List.of(song, mc) : List.of(song));
    }

    private Live createLive(List<FormBlockResponse> blocks) throws Exception {
        User user = userRepository.save(User.builder().sub("robust-sub").email("robust@example.com").name("R").build());
        Tenants tenant = tenantsRepository.save(Tenants.builder().name("Robust Tenant").user(user).build());
        userTenantRepository.save(UserTenant.builder().user(user).tenant(tenant).role(TenantRole.OWNER).build());
        return liveRepository.save(Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name("Robust Live")
                .status(LiveStatus.PUBLISHED)
                .settingsJson(objectMapper.writeValueAsString(config(blocks)))
                .build());
    }

    private void updateConfig(Live live, List<FormBlockResponse> blocks) throws Exception {
        live.setSettingsJson(objectMapper.writeValueAsString(config(blocks)));
        liveRepository.save(live);
    }

    private SettingSheetConfigResponse config(List<FormBlockResponse> blocks) {
        return new SettingSheetConfigResponse("公開フォーム", "", "送信する", false, blocks);
    }

    private UUID submitAndGetId(Live live, String body) throws Exception {
        MvcResult result = mockMvc.perform(submit(live, body)).andExpect(status().isOk()).andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private RequestBuilder submit(Live live, String body) {
        return post("/api/public/lives/{token}/setting-sheet/submissions", live.getPublicToken())
                .contentType(APPLICATION_JSON)
                .content(body);
    }

    private RequestBuilder update(Live live, UUID id, String body) {
        return put("/api/public/lives/{token}/setting-sheet/submissions/{id}", live.getPublicToken(), id)
                .contentType(APPLICATION_JSON)
                .content(body);
    }
}

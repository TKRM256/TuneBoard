package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.venueform.LivePdfLayout;
import jp.tubeboard.features.lives.venueform.LivePdfLayoutRepository;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/**
 * 権限ごとに、できる操作とできない操作を一覧で確かめる。
 * メンバーは見る・PDF に出すまで、テナント外の人は何も見られない。どちらも書き換えはできず、内容も変わらない。
 */
@IntegrationTest
@AutoConfigureMockMvc
class AuthorizationMatrixIntegrationTest {

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
    private LivePdfLayoutRepository layoutRepository;
    @Autowired
    private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    private Tenants tenant;
    private User admin;
    private User member;
    private Live live;
    private SettingSheetSubmission submission;
    private LivePdfLayout layout;
    private String memberToken;
    private String outsiderToken;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        admin = userRepository.save(User.builder().sub("am-admin").email("am-admin@example.com").name("A").picture("").build());
        member = userRepository.save(User.builder().sub("am-member").email("am-member@example.com").name("M").picture("").build());
        userRepository.save(User.builder().sub("am-outsider").email("am-outsider@example.com").name("O").picture("").build());
        tenant = tenantsRepository.save(Tenants.builder().name("権限テナント").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.OWNER).build());
        userTenantRepository.save(UserTenant.builder().user(member).tenant(tenant).role(TenantRole.MEMBER).build());
        live = liveRepository.save(Live.builder().tenant(tenant).publicToken(UUID.randomUUID().toString())
                .name("権限ライブ").status(LiveStatus.PUBLISHED).settingsJson("{}").build());
        submission = submissionRepository.save(SettingSheetSubmission.builder().live(live).recordLabel("Band A")
                .submissionStatus("SUBMITTED")
                .payloadJson("{\"answers\":[{\"fieldId\":\"band-name\",\"values\":[\"Band A\"],\"items\":[]}]}")
                .build());
        layout = layoutRepository.save(LivePdfLayout.builder().live(live).name("標準").sortOrder(0)
                .format(LivePdfLayout.FORMAT_V2).layoutJson("{\"pages\":[],\"elements\":[]}").build());
        memberToken = jwtTokenService.generateToken("am-member", "M", "am-member@example.com", "");
        outsiderToken = jwtTokenService.generateToken("am-outsider", "O", "am-outsider@example.com", "");
    }

    @Test
    void メンバーとテナント外の人は設定もデータも書き換えられず内容は変わらない() throws Exception {
        UUID id = live.getId();
        UUID sid = submission.getId();
        UUID lid = layout.getId();
        List<Request> writes = List.of(
                () -> json(post("/api/lives/update"), Map.of("id", id, "name", "乗っ取り")),
                () -> json(post("/api/lives/delete"), Map.of("id", id)),
                () -> json(post("/api/lives/purge"), Map.of("id", id)),
                () -> json(post("/api/lives/{id}/setting-sheet/config", id), Map.of("title", "乗っ取り", "description", "",
                        "submitButtonLabel", "x", "publicSubmissionEnabled", true, "blocks", List.of())),
                () -> json(post("/api/lives/{id}/setting-sheet/submissions/{sid}/delete", id, sid), Map.of()),
                () -> json(post("/api/lives/{id}/setting-sheet/submissions/{sid}/purge", id, sid), Map.of()),
                () -> json(post("/api/lives/{id}/setting-sheet/submissions/{sid}/admin-answers", id, sid), Map.of("answers", List.of())),
                () -> json(post("/api/lives/{id}/songs/duplicates/dismiss", id), Map.of("normalizedTitle", "x")),
                () -> json(post("/api/lives/{id}/pdf-layouts", id), Map.of("name", "乗っ取り", "source", "BLANK")),
                () -> json(put("/api/lives/{id}/pdf-layouts/{lid}", id, lid), Map.of("name", "乗っ取り",
                        "document", Map.of("pages", List.of(), "elements", List.of()))),
                () -> json(delete("/api/lives/{id}/pdf-layouts/{lid}", id, lid), Map.of()),
                () -> json(post("/api/lives/{id}/pdf-layouts/copy-from", id), Map.of("sourceLiveId", id, "sourceLayoutId", lid)),
                () -> json(post("/api/lives/{id}/stage-plot", id), Map.of("aspectRatio", 2.0, "iconScale", 0.1, "palette", List.of())),
                () -> json(delete("/api/lives/{id}/stage-plot/base", id), Map.of()),
                () -> json(post("/api/lives/{id}/stage-plot/copy-from", id), Map.of("sourceLiveId", id)),
                () -> json(post("/api/tenants/{tid}/invitations", tenant.getId()), Map.of("role", "ADMIN")),
                () -> json(put("/api/tenants/{tid}/members/{uid}/role", tenant.getId(), member.getId()), Map.of("role", "ADMIN")),
                () -> json(delete("/api/tenants/{tid}/members/{uid}", tenant.getId(), admin.getId()), Map.of()),
                () -> json(post("/api/tenants/update"), Map.of("id", tenant.getId(), "name", "乗っ取り")),
                () -> json(post("/api/tenants/delete"), Map.of("id", tenant.getId())));

        List<String> allowed = new ArrayList<>();
        for (String token : List.of(memberToken, outsiderToken)) {
            for (Request request : writes) {
                int status = statusOf(request, token);
                if (status != 403 && status != 404) {
                    allowed.add(status + " " + describe(request));
                }
            }
        }
        assertThat(allowed).as("止まらなかった操作").isEmpty();

        Live after = liveRepository.findById(live.getId()).orElseThrow();
        assertThat(after.getName()).isEqualTo("権限ライブ");
        assertThat(after.getDeletedAt()).isNull();
        assertThat(after.getSettingsJson()).isEqualTo("{}");
        assertThat(submissionRepository.findById(submission.getId()).orElseThrow().getDeletedAt()).isNull();
        assertThat(layoutRepository.findById(layout.getId()).orElseThrow().getName()).isEqualTo("標準");
        assertThat(layoutRepository.findById(layout.getId()).orElseThrow().getDeletedAt()).isNull();
        assertThat(tenantsRepository.findById(tenant.getId()).orElseThrow().getName()).isEqualTo("権限テナント");
        assertThat(userTenantRepository.findAll()).extracting(UserTenant::getRole)
                .containsExactlyInAnyOrder(TenantRole.OWNER, TenantRole.MEMBER);
    }

    @Test
    void メンバーは見るとPDFに出すことができテナント外の人は何も見られない() throws Exception {
        UUID id = live.getId();
        UUID sid = submission.getId();
        List<Request> reads = List.of(
                () -> get("/api/lives/{id}", id),
                () -> get("/api/lives/{id}/setting-sheet/config", id),
                () -> get("/api/lives/{id}/setting-sheet/submissions/details", id),
                () -> get("/api/lives/{id}/songs/duplicates", id),
                () -> get("/api/lives/{id}/pdf-layouts", id),
                () -> get("/api/lives/{id}/pdf-layouts/{lid}", id, layout.getId()),
                () -> get("/api/lives/{id}/stage-plot", id),
                () -> json(post("/api/lives/{id}/pdf-layouts/submissions/{sid}/pdf", id, sid), Map.of()));

        for (Request request : reads) {
            int asMember = statusOf(request, memberToken);
            assertThat(asMember).as("メンバー: %s", describe(request)).isEqualTo(200);
        }
        for (Request request : reads) {
            int asOutsider = statusOf(request, outsiderToken);
            assertThat(asOutsider).as("テナント外: %s", describe(request)).isIn(403, 404);
        }
    }

    /** 呼ぶたびに新しく作る（同じ組み立てを使い回すとヘッダーが重なる）。 */
    @FunctionalInterface
    private interface Request {
        MockHttpServletRequestBuilder build() throws Exception;
    }

    private int statusOf(Request request, String token) throws Exception {
        return mockMvc.perform(request.build().header("Authorization", "Bearer " + token)).andReturn().getResponse().getStatus();
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return request.contentType(APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
    }

    private static String describe(Request request) throws Exception {
        MockHttpServletRequestBuilder built = request.build();
        var servletRequest = built.buildRequest(new org.springframework.mock.web.MockServletContext());
        return servletRequest.getMethod() + " " + servletRequest.getRequestURI();
    }
}

package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.asset.LiveAssetRepository;
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

@IntegrationTest
@AutoConfigureMockMvc
class PdfLayoutIntegrationTest {

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
    private LiveAssetRepository assetRepository;
    @Autowired
    private LivePdfLayoutRepository layoutRepository;
    @Autowired
    private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    private Tenants tenant;
    private Live live;
    private SettingSheetSubmission submission;
    private String adminToken;
    private String memberToken;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder().sub("vf-admin").email("vf-admin@example.com")
                .name("Admin").picture("").build());
        User member = userRepository.save(User.builder().sub("vf-member").email("vf-member@example.com")
                .name("Member").picture("").build());
        tenant = tenantsRepository.save(Tenants.builder().name("書式テナント").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.ADMIN).build());
        userTenantRepository.save(UserTenant.builder().user(member).tenant(tenant).role(TenantRole.MEMBER).build());
        live = createLive("新歓ライブ");
        submission = submissionRepository.save(SettingSheetSubmission.builder()
                .live(live)
                .recordLabel("Band A")
                .submissionStatus("SUBMITTED")
                .payloadJson("{\"answers\":[{\"fieldId\":\"band-name\",\"values\":[\"Band A\"],\"items\":[]}]}")
                .build());
        adminToken = jwtTokenService.generateToken("vf-admin", "Admin", "vf-admin@example.com", "");
        memberToken = jwtTokenService.generateToken("vf-member", "Member", "vf-member@example.com", "");
    }

    @Test
    void 背景をアップロードし書式を保存してPDFに出力できる() throws Exception {
        UUID assetId = uploadBackground(live, adminToken);
        UUID layoutId = createLayout(live, "会場書式", "BLANK");

        mockMvc.perform(put("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), layoutId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "会場の申込書", "document", document(assetId)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.pages[0].background.assetId").value(assetId.toString()));

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), layoutId)
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("会場の申込書"))
                .andExpect(jsonPath("$.assets[0].pages[0].widthMm").value(210.0))
                .andExpect(jsonPath("$.document.elements[0].kind").value("text"));

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/assets/{assetId}/pages/0", live.getId(), assetId)
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("image/png"));

        assertThat(pdfText(Map.of("layoutId", layoutId))).contains("Band A");

        mockMvc.perform(post("/api/lives/{id}/pdf-layouts/submissions/zip", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("submissionIds", List.of(submission.getId()),
                        "layoutId", layoutId))))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("application/zip"));
    }

    @Test
    void 書式は複数持てて一覧に並び消すと一覧から外れる() throws Exception {
        UUID first = createLayout(live, "標準", "FORM");
        UUID second = createLayout(live, "会場書式", "BLANK");

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts", live.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(first.toString()))
                .andExpect(jsonPath("$[0].pageCount").value(1))
                .andExpect(jsonPath("$[1].name").value("会場書式"))
                // 白紙から作ると A4 のページが 1 枚ある
                .andExpect(jsonPath("$[1].pageCount").value(1));

        mockMvc.perform(delete("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), second)
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts", live.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 統合前のPDFレイアウトは今の形に直して読め出力できる() throws Exception {
        // 本番の lives.pdf_canvas_json は、V20 でこの形のまま移される
        LivePdfLayout legacy = layoutRepository.save(LivePdfLayout.builder().live(live).name("標準").sortOrder(0)
                .format(LivePdfLayout.FORMAT_CANVAS_V1)
                .layoutJson("""
                        {"page":{"size":"B5","orientation":"PORTRAIT","marginMm":8,"baseFontSizePt":9},
                         "elements":[
                          {"kind":"text","id":"t1","xMm":10,"yMm":10,"wMm":100,"hMm":10,
                           "content":"${live.name}","fontSizePt":14},
                          {"kind":"divider","id":"d1","xMm":10,"yMm":22,"wMm":100,"hMm":1,
                           "color":"#cccccc","thicknessPt":1},
                          {"kind":"spacer","id":"s1","xMm":10,"yMm":30,"wMm":10,"hMm":10},
                          {"kind":"table","id":"g1","xMm":10,"yMm":40,"wMm":150,"hMm":20,
                           "source":{"kind":"fields","fields":[{"fieldId":"band-name","fallbackLabel":"バンド名"}]},
                           "columns":[{"id":"c1","header":"項目","fieldId":"__label__","widthRatio":0.3},
                                      {"id":"c2","header":"内容","fieldId":"","widthRatio":0.7}],
                           "showHeader":true,"fontSizePt":9,"autoGrow":true}]}
                        """)
                .build());

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), legacy.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.pages.length()").value(1))
                .andExpect(jsonPath("$.document.pages[0].widthMm").value(182.0))
                .andExpect(jsonPath("$.document.pages[0].marginMm").value(8.0))
                .andExpect(jsonPath("$.document.elements.length()").value(3))
                .andExpect(jsonPath("$.document.elements[1].kind").value("shape"))
                .andExpect(jsonPath("$.document.elements[2].kind").value("grid"));

        assertThat(pdfText(Map.of("layoutId", legacy.getId()))).contains("新歓ライブ").contains("Band A");
    }

    @Test
    void 書式を選ばなければフォームの項目を並べた書式で出力する() throws Exception {
        assertThat(pdfText(Map.of())).contains("新歓ライブ");
    }

    @Test
    void フォームの項目を並べた書式を保存せずに受け取れメンバーは受け取れない() throws Exception {
        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/form-template", live.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages").isNotEmpty())
                .andExpect(jsonPath("$.elements").isNotEmpty());
        assertThat(layoutRepository.findAll()).isEmpty();

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/form-template", live.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void 確認APIは条件式の誤りを警告で返す() throws Exception {
        UUID assetId = uploadBackground(live, adminToken);
        Map<String, Object> doc = Map.of(
                "pages", List.of(page(assetId)),
                "elements", List.of(Map.of("kind", "text", "id", "e1", "pageId", "p1", "xMm", 10, "yMm", 10,
                        "wMm", 50, "hMm", 8, "content", "x", "condition", "contains(")));

        mockMvc.perform(post("/api/lives/{id}/pdf-layouts/check", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("submissionId", submission.getId(), "document", doc))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warnings[0]").value(org.hamcrest.Matchers.containsString("表示条件")));
    }

    @Test
    void メンバーは書式を作れず背景もアップロードできない() throws Exception {
        mockMvc.perform(post("/api/lives/{id}/pdf-layouts", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "x", "source", "BLANK"))))
                .andExpect(status().isNotFound());

        mockMvc.perform(multipart("/api/lives/{id}/pdf-layouts/assets", live.getId())
                .file(new MockMultipartFile("file", "a.pdf", "application/pdf", pdf()))
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void 他のライブの背景は参照できない() throws Exception {
        Live other = createLive("別のライブ");
        UUID otherAsset = uploadBackground(other, adminToken);
        UUID layoutId = createLayout(live, "会場書式", "BLANK");

        mockMvc.perform(put("/api/lives/{id}/pdf-layouts/{layoutId}", live.getId(), layoutId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", "会場書式", "document", document(otherAsset)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("背景のファイル")));
    }

    @Test
    void 他のライブから背景ごとコピーでき使われない背景は消える() throws Exception {
        Live source = createLive("コピー元");
        UUID sourceAsset = uploadBackground(source, adminToken);
        UUID sourceLayout = createLayout(source, "会場書式", "BLANK");
        save(source, sourceLayout, Map.of("name", "会場書式", "document", document(sourceAsset)));
        UUID unusedAsset = uploadBackground(live, adminToken);

        MvcResult copied = mockMvc.perform(post("/api/lives/{id}/pdf-layouts/copy-from", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("sourceLiveId", source.getId(),
                        "sourceLayoutId", sourceLayout))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("会場書式"))
                .andReturn();

        JsonNode body = objectMapper.readTree(copied.getResponse().getContentAsString());
        UUID copiedAsset = UUID.fromString(body.path("document").path("pages").get(0).path("background")
                .path("assetId").asText());
        assertThat(copiedAsset).isNotEqualTo(sourceAsset);
        assertThat(assetRepository.findById(sourceAsset)).isPresent();

        // 保存すると、どの書式にも使われていない背景は片付く
        save(live, UUID.fromString(body.path("id").asText()), Map.of("name", "会場書式",
                "document", body.path("document")));
        assertThat(assetRepository.findById(unusedAsset)).isEmpty();
        assertThat(assetRepository.findById(copiedAsset)).isPresent();
    }

    @Test
    void 罫線つきの表の必要な高さを測れる() throws Exception {
        Map<String, Object> grid = new java.util.HashMap<>(Map.of("kind", "grid", "id", "g1", "pageId", "p1",
                "xMm", 10, "yMm", 10, "wMm", 150, "hMm", 3, "showHeader", true, "fontSizePt", 9));
        grid.put("source", Map.of("kind", "fields", "fields", List.of(Map.of("fieldId", "band-name"))));
        grid.put("columns", List.of(Map.of("id", "c1", "header", "内容", "fieldId", "", "widthRatio", 1)));
        Map<String, Object> doc = Map.of("pages", List.of(Map.of("id", "p1", "widthMm", 210, "heightMm", 297)),
                "elements", List.of(grid));

        mockMvc.perform(post("/api/lives/{id}/pdf-layouts/measure", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("submissionId", submission.getId(), "document", doc))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tables[0].elementId").value("g1"))
                .andExpect(jsonPath("$.tables[0].requiredHeightMm", org.hamcrest.Matchers.greaterThan(3.0)));
    }

    @Test
    void ステージの下絵は公開URLから取得でき外すと見えなくなる() throws Exception {
        mockMvc.perform(multipart("/api/lives/{id}/stage-plot/base", live.getId())
                .file(new MockMultipartFile("file", "stage.png", "image/png", png()))
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.base.contentType").value("image/png"))
                .andExpect(jsonPath("$.settings.aspectRatio").value(2.0));

        mockMvc.perform(get("/api/public/lives/{token}/stage-plot/base", live.getPublicToken()))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("image/png"));

        mockMvc.perform(delete("/api/lives/{id}/stage-plot/base", live.getId())
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/public/lives/{token}/stage-plot/base", live.getPublicToken()))
                .andExpect(status().isNotFound());
    }

    @Test
    void 書式の背景のページを切り出して下絵にできる() throws Exception {
        UUID assetId = uploadBackground(live, adminToken);

        mockMvc.perform(post("/api/lives/{id}/stage-plot/base/from-venue-form", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("assetId", assetId, "pageIndex", 0,
                        "x", 0.1, "y", 0.1, "width", 0.5, "height", 0.25))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.base.contentType").value("image/png"));
    }

    @Test
    void アイコンの一覧を保存すると公開APIに出る() throws Exception {
        Map<String, Object> palette = Map.of("id", "gt", "iconName", "guitar", "label", "Gt", "color", "#111827",
                "nodes", List.of(List.of("circle", Map.of("cx", "12", "cy", "12", "r", "10"))));
        mockMvc.perform(post("/api/lives/{id}/stage-plot", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("iconScale", 0.1, "palette", List.of(palette)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.palette[0].nodes[0][0]").value("circle"));

        mockMvc.perform(get("/api/public/lives/{token}", live.getPublicToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stagePlot.palette[0].label").value("Gt"))
                .andExpect(jsonPath("$.stagePlot.hasBase").value(false));
    }

    // ───────── helpers ─────────

    private Live createLive(String name) {
        return liveRepository.save(Live.builder()
                .tenant(tenant)
                .publicToken(UUID.randomUUID().toString())
                .name(name)
                .status(LiveStatus.PUBLISHED)
                .settingsJson("{}")
                .build());
    }

    private UUID createLayout(Live target, String name, String source) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/lives/{id}/pdf-layouts", target.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("name", name, "source", source))))
                .andExpect(status().isOk())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private void save(Live target, UUID layoutId, Map<String, Object> body) throws Exception {
        mockMvc.perform(put("/api/lives/{id}/pdf-layouts/{layoutId}", target.getId(), layoutId)
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
    }

    private String pdfText(Map<String, Object> body) throws Exception {
        MvcResult pdf = mockMvc.perform(post("/api/lives/{id}/pdf-layouts/submissions/{sid}/pdf", live.getId(),
                submission.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andReturn();
        try (PDDocument doc = Loader.loadPDF(pdf.getResponse().getContentAsByteArray())) {
            return new PDFTextStripper().getText(doc);
        }
    }

    private UUID uploadBackground(Live target, String token) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/lives/{id}/pdf-layouts/assets", target.getId())
                .file(new MockMultipartFile("file", "venue.pdf", "application/pdf", pdf()))
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private static Map<String, Object> page(UUID assetId) {
        return Map.of("id", "p1", "widthMm", 210, "heightMm", 297,
                "background", Map.of("assetId", assetId, "pageIndex", 0));
    }

    private static Map<String, Object> document(UUID assetId) {
        return Map.of(
                "pages", List.of(page(assetId)),
                "elements", List.of(Map.of("kind", "text", "id", "e1", "pageId", "p1", "xMm", 20, "yMm", 20,
                        "wMm", 100, "hMm", 10, "content", "${fields['band-name'].value}", "fontSizePt", 12)));
    }

    private static byte[] pdf() throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.addPage(new PDPage(PDRectangle.A4));
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static byte[] png() throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(new BufferedImage(200, 100, BufferedImage.TYPE_INT_RGB), "png", out);
            return out.toByteArray();
        }
    }
}

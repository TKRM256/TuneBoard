package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

@IntegrationTest
@AutoConfigureMockMvc
class VenueFormIntegrationTest {

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
        tenant = tenantsRepository.save(Tenants.builder().name("会場書式テナント").user(admin).build());
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

        mockMvc.perform(post("/api/lives/{id}/venue-form", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("document", document(assetId)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.document.pages[0].background.assetId").value(assetId.toString()));

        mockMvc.perform(get("/api/lives/{id}/venue-form", live.getId())
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assets[0].pages[0].widthMm").value(210.0))
                .andExpect(jsonPath("$.document.elements[0].kind").value("text"));

        mockMvc.perform(get("/api/lives/{id}/venue-form/assets/{assetId}/pages/0", live.getId(), assetId)
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("image/png"));

        MvcResult pdf = mockMvc.perform(post("/api/lives/{id}/venue-form/submissions/{sid}/pdf", live.getId(),
                submission.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk())
                .andReturn();
        try (PDDocument doc = Loader.loadPDF(pdf.getResponse().getContentAsByteArray())) {
            assertThat(new PDFTextStripper().getText(doc)).contains("Band A");
        }

        mockMvc.perform(post("/api/lives/{id}/venue-form/submissions/zip", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("submissionIds", List.of(submission.getId())))))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentType()).isEqualTo("application/zip"));
    }

    @Test
    void 確認APIは条件式の誤りを警告で返す() throws Exception {
        UUID assetId = uploadBackground(live, adminToken);
        Map<String, Object> doc = Map.of(
                "pages", List.of(page(assetId)),
                "elements", List.of(Map.of("kind", "text", "id", "e1", "pageId", "p1", "xMm", 10, "yMm", 10,
                        "wMm", 50, "hMm", 8, "content", "x", "condition", "contains(")));

        mockMvc.perform(post("/api/lives/{id}/venue-form/check", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("submissionId", submission.getId(), "document", doc))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warnings[0]").value(org.hamcrest.Matchers.containsString("表示条件")));
    }

    @Test
    void メンバーは書式を保存できず背景もアップロードできない() throws Exception {
        mockMvc.perform(post("/api/lives/{id}/venue-form", live.getId())
                .header("Authorization", "Bearer " + memberToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("document",
                        Map.of("pages", List.of(), "elements", List.of())))))
                .andExpect(status().isNotFound());

        mockMvc.perform(multipart("/api/lives/{id}/venue-form/assets", live.getId())
                .file(new MockMultipartFile("file", "a.pdf", "application/pdf", pdf()))
                .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void 他のライブの背景は参照できない() throws Exception {
        Live other = createLive("別のライブ");
        UUID otherAsset = uploadBackground(other, adminToken);

        mockMvc.perform(post("/api/lives/{id}/venue-form", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("document", document(otherAsset)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("背景のファイル")));
    }

    @Test
    void 他のライブから背景ごとコピーでき差し替えた古い背景は消える() throws Exception {
        Live source = createLive("コピー元");
        UUID sourceAsset = uploadBackground(source, adminToken);
        mockMvc.perform(post("/api/lives/{id}/venue-form", source.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("document", document(sourceAsset)))))
                .andExpect(status().isOk());
        UUID oldAsset = uploadBackground(live, adminToken);

        MvcResult copied = mockMvc.perform(post("/api/lives/{id}/venue-form/copy-from", live.getId())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("sourceLiveId", source.getId()))))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = objectMapper.readTree(copied.getResponse().getContentAsString());
        UUID copiedAsset = UUID.fromString(body.path("document").path("pages").get(0).path("background")
                .path("assetId").asText());
        assertThat(copiedAsset).isNotEqualTo(sourceAsset);
        assertThat(assetRepository.findById(oldAsset)).isEmpty();
        assertThat(assetRepository.findById(sourceAsset)).isPresent();
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
    void 会場書式のページを切り出して下絵にできる() throws Exception {
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

    private UUID uploadBackground(Live target, String token) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/lives/{id}/venue-form/assets", target.getId())
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

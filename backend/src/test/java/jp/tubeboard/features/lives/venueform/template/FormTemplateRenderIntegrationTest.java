package jp.tubeboard.features.lives.venueform.template;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
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
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.venueform.template.OddForms.Paper;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/**
 * 変わった形のフォームに回答を入れ、用紙ごとに並べた書式で実際に PDF にする。式が壊れていれば落ち、回答が載っていなければ落ちる。
 * 環境変数 TEMPLATE_SHOT_DIR を渡すと、ページを画像にして書き出す（目で確かめるとき用）。
 */
@IntegrationTest
@AutoConfigureMockMvc
class FormTemplateRenderIntegrationTest {

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
    private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();
    private Tenants tenant;
    private String token;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();
        User admin = userRepository.save(User.builder().sub("tpl-admin").email("tpl@example.com").name("A").picture("").build());
        tenant = tenantsRepository.save(Tenants.builder().name("テンプレート確認").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.OWNER).build());
        token = jwtTokenService.generateToken("tpl-admin", "A", "tpl@example.com", "");
    }

    @Test
    void 変わった形のフォームも用紙ごとに並べてPDFにでき回答が載る() throws Exception {
        String shotDir = System.getenv("TEMPLATE_SHOT_DIR");
        List<String> problems = new ArrayList<>();
        for (Map.Entry<String, SettingSheetConfigResponse> form : OddForms.all().entrySet()) {
            Live live = liveRepository.save(Live.builder().tenant(tenant).publicToken(UUID.randomUUID().toString())
                    .name(form.getKey()).status(LiveStatus.PUBLISHED).settingsJson("{}").build());
            mockMvc.perform(post("/api/lives/{id}/setting-sheet/config", live.getId())
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(form.getValue())))
                    .andExpect(status().isOk());
            SettingSheetSubmission submission = submissionRepository.save(SettingSheetSubmission.builder()
                    .live(live).recordLabel("見本").submissionStatus("SUBMITTED")
                    .payloadJson(objectMapper.writeValueAsString(Map.of("answers", answers(form.getValue().blocks()))))
                    .build());
            List<String> expected = sampleValues(form.getValue().blocks());

            for (Paper paper : OddForms.PAPERS) {
                JsonNode document = objectMapper.readTree(mockMvc.perform(
                        get("/api/lives/{id}/pdf-layouts/form-template", live.getId())
                                .param("widthMm", String.valueOf(paper.widthMm()))
                                .param("heightMm", String.valueOf(paper.heightMm()))
                                .header("Authorization", "Bearer " + token))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString());
                byte[] pdf = mockMvc.perform(post("/api/lives/{id}/pdf-layouts/submissions/{sid}/pdf", live.getId(),
                        submission.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("document", document))))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsByteArray();
                try (PDDocument doc = Loader.loadPDF(pdf)) {
                    // 文字の形の都合で「文」などが部首の文字として取り出されるので、正規化して比べる
                    String text = Normalizer.normalize(new PDFTextStripper().getText(doc), Normalizer.Form.NFKC)
                            .replaceAll("\\s+", "");
                    if (text.contains("true") || text.contains("false")) {
                        problems.add(form.getKey() + " / " + paper + ": true / false がそのまま出ている");
                    }
                    for (String value : expected) {
                        if (!text.contains(value)) problems.add(form.getKey() + " / " + paper + ": " + value + " が無い");
                    }
                    if (shotDir != null) shoot(doc, Path.of(shotDir), form.getKey() + "_" + paper);
                }
            }
        }
        assertThat(problems).isEmpty();
    }

    /** 隠していない項目すべてに、見本の回答を入れる。繰り返しは 2 件。 */
    private List<Map<String, Object>> answers(List<FormBlockResponse> blocks) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (blocks == null) return out;
        for (FormBlockResponse block : blocks) {
            switch (block.type()) {
                case "SECTION" -> out.addAll(answers(block.fields()));
                case "STAGE_PLOT" -> {
                }
                case "REPEATABLE_GROUP" -> {
                    List<Map<String, Object>> items = new ArrayList<>();
                    for (int i = 0; i < 2; i++) {
                        String variant = block.variants() == null || block.variants().isEmpty() ? null
                                : block.variants().get(i % block.variants().size()).id();
                        Map<String, Object> item = new HashMap<>();
                        item.put("variantId", variant);
                        item.put("answers", answers(block.itemFields(variant)));
                        items.add(item);
                    }
                    out.add(Map.of("fieldId", block.id(), "values", List.of(), "items", items));
                }
                default -> out.add(Map.of("fieldId", block.id(), "values", valuesOf(block), "items", List.of()));
            }
        }
        return out;
    }

    private static List<String> valuesOf(FormBlockResponse block) {
        return switch (block.type()) {
            case "LONG_TEXT" -> List.of("LT" + block.id() + "\n二行目");
            case "SINGLE_SELECT", "CHECKBOX" -> List.of("あ");
            case "MULTI_SELECT" -> List.of("あ", "い");
            case "BOOLEAN" -> List.of("true");
            case "SONG" -> List.of("曲名" + block.id(), "歌手");
            case "DURATION" -> List.of("3:30");
            default -> List.of("値" + block.id());
        };
    }

    /** PDF に必ず出ているはずの文字（隠していない文字の項目の回答）。 */
    private static List<String> sampleValues(List<FormBlockResponse> blocks) {
        List<String> out = new ArrayList<>();
        if (blocks == null) return out;
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) continue;
            switch (block.type()) {
                case "SECTION", "REPEATABLE_GROUP" -> {
                    out.addAll(sampleValues(block.fields()));
                    if (block.variants() != null) block.variants().forEach(v -> out.addAll(sampleValues(v.fields())));
                }
                case "SHORT_TEXT" -> out.add("値" + block.id());
                case "LONG_TEXT" -> out.add("LT" + block.id());
                default -> {
                }
            }
        }
        return out.stream().distinct().toList();
    }

    private static void shoot(PDDocument doc, Path dir, String name) throws Exception {
        Files.createDirectories(dir);
        PDFRenderer renderer = new PDFRenderer(doc);
        for (int page = 0; page < Math.min(doc.getNumberOfPages(), 3); page++) {
            BufferedImage image = renderer.renderImageWithDPI(page, 50);
            ImageIO.write(image, "png", dir.resolve(name + "_p" + (page + 1) + ".png").toFile());
        }
    }
}

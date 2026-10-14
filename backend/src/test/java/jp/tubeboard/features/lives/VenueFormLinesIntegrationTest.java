package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.repository.ItunesTrackLinkRepository;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.venueform.lines.LiveAssetPageLinesRepository;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;

/** 会場書式の背景から罫線を検出する API。 */
@IntegrationTest
@AutoConfigureMockMvc
class VenueFormLinesIntegrationTest {

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
    private ItunesTrackLinkRepository itunesTrackLinkRepository;
    @Autowired
    private SettingSheetSubmissionRepository submissionRepository;
    @Autowired
    private LiveAssetPageLinesRepository linesRepository;
    @Autowired
    private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    private Live live;
    private String token;

    @BeforeEach
    void setUp() {
        // 他のテストが残した提出があるとライブを消せないので、先に消す
        itunesTrackLinkRepository.deleteAll();
        submissionRepository.deleteAll();
        liveRepository.deleteAll();
        userTenantRepository.deleteAll();
        tenantsRepository.deleteAll();
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder().sub("lines-admin").email("lines-admin@example.com")
                .name("Admin").picture("").build());
        Tenants tenant = tenantsRepository.save(Tenants.builder().name("罫線テナント").user(admin).build());
        userTenantRepository.save(UserTenant.builder().user(admin).tenant(tenant).role(TenantRole.ADMIN).build());
        live = liveRepository.save(Live.builder().tenant(tenant).publicToken(UUID.randomUUID().toString())
                .name("ライブ").status(LiveStatus.PUBLISHED).settingsJson("{}").build());
        token = jwtTokenService.generateToken("lines-admin", "Admin", "lines-admin@example.com", "");
    }

    @Test
    void 背景のPDFから罫線を検出し2回目は保存した結果を返す() throws Exception {
        UUID assetId = upload(pdfWithBox());

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(get("/api/lives/{id}/pdf-layouts/assets/{assetId}/pages/0/lines", live.getId(), assetId)
                    .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.lines.length()").value(4))
                    .andExpect(jsonPath("$.lines[0].axis").exists());
        }
        assertThat(linesRepository.findAll()).hasSize(1);
    }

    @Test
    void 無いページは400を返す() throws Exception {
        UUID assetId = upload(pdfWithBox());

        mockMvc.perform(get("/api/lives/{id}/pdf-layouts/assets/{assetId}/pages/3/lines", live.getId(), assetId)
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    private UUID upload(byte[] pdf) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/lives/{id}/pdf-layouts/assets", live.getId())
                .file(new MockMultipartFile("file", "venue.pdf", "application/pdf", pdf))
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asText());
    }

    private static byte[] pdfWithBox() throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
                content.addRect(100, 500, 300, 100);
                content.stroke();
            }
            doc.save(out);
            return out.toByteArray();
        }
    }
}

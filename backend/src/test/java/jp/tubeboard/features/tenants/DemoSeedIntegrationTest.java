package jp.tubeboard.features.tenants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.JwtTokenService;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;

/**
 * 開発用のダミーデータ：初めて一覧を開いた人に作られるテナント・ライブに、会場書式とステージ配置図も入っていて、
 * どの提出でも式のエラーなく会場書式の PDF を出せること。
 */
@IntegrationTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.dev.seed-dummy=true")
class DemoSeedIntegrationTest {

    /** テナント → 会場書式を入れたライブ（各テナントの最初のライブ） */
    private static final Map<String, String> VENUE_FORM_LIVES = Map.of(
            "デモサークル", "春ライブ 2026",
            "ダンス部 STEP", "春の発表会 2026",
            "合同ライブ運営チーム", "合同フェス 2026");

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtTokenService jwtTokenService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private String token;

    @Test
    void ダミーデータの会場書式はどの提出でも式のエラーなくPDFにできる() throws Exception {
        userRepository.save(User.builder().sub("demo-seed-check").email("demo-seed@example.com").name("確認").build());
        token = jwtTokenService.generateToken("demo-seed-check", "確認", "demo-seed@example.com", "");

        JsonNode tenants = getJson("/api/tenants/list");
        assertThat(names(tenants)).containsExactlyInAnyOrderElementsOf(VENUE_FORM_LIVES.keySet());

        for (JsonNode tenant : tenants) {
            String liveName = VENUE_FORM_LIVES.get(tenant.get("name").asText());
            JsonNode lives = getJson("/api/lives/tenant/" + tenant.get("id").asText() + "/list");
            for (JsonNode live : lives) {
                String liveId = live.get("id").asText();
                JsonNode stagePlot = getJson("/api/lives/" + liveId + "/stage-plot");
                assertThat(stagePlot.at("/settings/palette").size()).as("palette %s", live.get("name")).isPositive();
                assertThat(stagePlot.get("base").isNull()).isFalse();
                if (live.get("name").asText().equals(liveName)) {
                    checkVenueForm(liveId, liveName);
                }
            }
        }
    }

    private void checkVenueForm(String liveId, String liveName) throws Exception {
        JsonNode venueForm = getJson("/api/lives/" + liveId + "/venue-form");
        JsonNode document = venueForm.get("document");
        assertThat(document.get("elements").size()).as(liveName).isGreaterThan(10);
        assertThat(venueForm.get("assets").size()).isEqualTo(1);

        JsonNode submissions = getJson("/api/lives/" + liveId + "/setting-sheet/submissions");
        assertThat(submissions.size()).isPositive();
        for (JsonNode submission : submissions) {
            String submissionId = submission.get("id").asText();
            String body = objectMapper.writeValueAsString(Map.of("submissionId", submissionId, "document", document));
            JsonNode check = objectMapper.readTree(mockMvc.perform(post("/api/lives/" + liveId + "/venue-form/check")
                    .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
            // 書式の行数より多い件（出演者 6 人など）は書ききれない警告が出てよい。それ以外の警告（式のエラーなど）は無いこと
            List<String> problems = names(check.get("warnings")).stream()
                    .filter(warning -> !warning.contains("入りきらない")).toList();
            assertThat(problems).as("%s %s", liveName, submission.get("recordLabel")).isEmpty();
        }

        String firstId = submissions.get(0).get("id").asText();
        byte[] pdf = mockMvc.perform(post("/api/lives/" + liveId + "/venue-form/submissions/" + firstId + "/pdf")
                .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    private JsonNode getJson(String url) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    /** 配列の要素が文字ならそのまま、オブジェクトなら name を並べる。 */
    private static List<String> names(JsonNode array) {
        return java.util.stream.StreamSupport.stream(array.spliterator(), false)
                .map(node -> node.isTextual() ? node.asText() : node.get("name").asText())
                .toList();
    }
}

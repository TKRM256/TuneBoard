package jp.tubeboard.features.lives.pdf.dsl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslDocument;

class DslPipelineTest {

    private static final LayoutResponse LAYOUT_HALF = new LayoutResponse("half", 1, false);

    private final DslParser parser = new DslParser();
    private final DslEvaluator evaluator = new DslEvaluator();

    @Test
    void parsesMinimalYaml() {
        DslDocument doc = parser.parse("page:\n  size: A4\nrows: []\n");
        assertNotNull(doc);
        assertNotNull(doc.page());
        assertEquals(0, doc.rows().size());
    }

    @Test
    void parsesIfWithThenElse() {
        String yaml = """
                rows:
                  - type: if
                    cond: "${1 == 1}"
                    then:
                      - type: text
                        text: "yes"
                    else:
                      - type: text
                        text: "no"
                """;
        DslDocument doc = parser.parse(yaml);
        assertEquals(1, doc.rows().size());
        DslSchema.DslNode.If node = (DslSchema.DslNode.If) doc.rows().get(0);
        assertEquals("${1 == 1}", node.cond());
        assertNotNull(node.thenBranch());
        assertEquals(1, node.thenBranch().nodes().size());
        assertNotNull(node.elseBranch());
    }

    @Test
    void parsesNestedRowAndColumns() {
        String yaml = """
                rows:
                  - type: row
                    columns:
                      - width: 0.5
                        render:
                          - type: text
                            text: "L"
                      - width: 0.5
                        render:
                          - type: text
                            text: "R"
                """;
        DslDocument doc = parser.parse(yaml);
        DslSchema.DslNode.Row row = (DslSchema.DslNode.Row) doc.rows().get(0);
        assertEquals(2, row.columns().size());
    }

    @Test
    void evaluateInterpolation() {
        Map<String, Object> ns = new HashMap<>();
        ns.put("name", "World");
        assertEquals("Hello World!", evaluator.interpolate("Hello ${name}!", ns));
    }

    @Test
    void evaluateTernary() {
        Map<String, Object> ns = new HashMap<>();
        ns.put("isMember", true);
        assertEquals("○", evaluator.interpolate("${isMember ? '○' : '×'}", ns));
    }

    @Test
    void evaluateHelperFunctionInDefaultNamespace() {
        Map<String, Object> ns = new HashMap<>();
        ns.put("flag", "true");
        // Helpers are registered in the default namespace; boolMark(...) should resolve.
        String out = evaluator.interpolate("${boolMark(flag)}", ns);
        assertTrue(out.equals("○"), "expected ○ but got: " + out);
    }

    @Test
    void evaluateAccessRecordAccessors() {
        Map<String, Object> ns = new HashMap<>();
        DslContext.FieldRef ref = new DslContext.FieldRef("Vo", List.of("Vo", "Gt"), false);
        ns.put("f", ref);
        assertEquals("Vo", evaluator.interpolate("${f.value}", ns));
        assertEquals("Vo / Gt", evaluator.interpolate("${join(f.values, ' / ')}", ns));
    }

    @Test
    void contextBuildsFromRealDtos() {
        LiveResponse live = sampleLive();
        SettingSheetConfigResponse config = sampleConfig();
        PublicSettingSheetSubmissionDetailResponse submission = sampleSubmission();

        Map<String, Object> ns = DslContext.build(live, config, submission);
        assertNotNull(ns.get("live"));
        assertNotNull(ns.get("submission"));
        @SuppressWarnings("unchecked")
        Map<String, DslContext.FieldRef> fields = (Map<String, DslContext.FieldRef>) ns.get("fields");
        assertEquals("KingGnu", fields.get("band-name").getValue());
        @SuppressWarnings("unchecked")
        Map<String, DslContext.GroupRef> groups = (Map<String, DslContext.GroupRef>) ns.get("groups");
        assertEquals(2, groups.get("members").getItems().size());
        assertEquals("田中",
                evaluator.interpolate("${groups['members'].items[0].field('member-name').value}", ns));
    }

    private LiveResponse sampleLive() {
        return new LiveResponse(UUID.randomUUID(), UUID.randomUUID(), "テストテナント", "tok",
                "サマーライブ", LocalDate.of(2026, 7, 1), "渋谷ホール",
                LocalDateTime.of(2026, 6, 25, 18, 0), LiveStatus.PUBLISHED);
    }

    private SettingSheetConfigResponse sampleConfig() {
        FormBlockResponse bandName = leaf("band-name", "SHORT_TEXT", "バンド名");
        FormBlockResponse memberName = leaf("member-name", "SHORT_TEXT", "氏名");
        FormBlockResponse memberPart = leaf("member-parts", "MULTI_SELECT", "パート");
        FormBlockResponse members = group("members", "出演者", List.of(memberName, memberPart));
        return new SettingSheetConfigResponse("バンド申請", "", "送信", true,
                List.of(bandName, members));
    }

    private PublicSettingSheetSubmissionDetailResponse sampleSubmission() {
        FieldAnswerResponse bandName = new FieldAnswerResponse("band-name", List.of("KingGnu"), List.of());
        FieldAnswerResponse memberItems = new FieldAnswerResponse("members", List.of(), List.of(
                new GroupItemResponse(null, List.of(
                        new FieldAnswerResponse("member-name", List.of("田中"), List.of()),
                        new FieldAnswerResponse("member-parts", List.of("Vo", "Gt"), List.of()))),
                new GroupItemResponse(null, List.of(
                        new FieldAnswerResponse("member-name", List.of("佐藤"), List.of()),
                        new FieldAnswerResponse("member-parts", List.of("Ba"), List.of())))));
        return new PublicSettingSheetSubmissionDetailResponse(UUID.randomUUID(), "KingGnu", "完成",
                LocalDateTime.of(2026, 6, 20, 12, 0), List.of(bandName, memberItems), List.of());
    }

    private FormBlockResponse leaf(String id, String type, String label) {
        return new FormBlockResponse(id, type, label, "", false, true, false, false,
                "outline", "plain", List.of(), 0, "", "", "", List.of(), LAYOUT_HALF, null, "", List.of());
    }

    private FormBlockResponse group(String id, String label, List<FormBlockResponse> children) {
        return new FormBlockResponse(id, "REPEATABLE_GROUP", label, "", false, true, false, true,
                "subtle", "outline", List.of(), 1, "追加", "項目", "", children, LAYOUT_HALF, null, "",
                List.of(new VariantResponse("default", "default", children)));
    }
}

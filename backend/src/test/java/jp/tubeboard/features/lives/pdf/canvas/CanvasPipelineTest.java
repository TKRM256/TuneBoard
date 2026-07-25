package jp.tubeboard.features.lives.pdf.canvas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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

class CanvasPipelineTest {

    private static final LayoutResponse LAYOUT_HALF = new LayoutResponse("half", 1, false);

    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();

    @Test
    void joinFieldHelperConcatenatesAcrossItems() {
        Map<String, Object> ns = CanvasContext.build(sampleLive(), sampleConfig(), sampleSubmission());
        String out = evaluator.interpolate(
                "${joinField(groups['members'], 'member-name', ' / ')}", ns);
        assertEquals("田中 / 佐藤", out);
    }

    @Test
    void filterEqualsHelperReturnsMatchingItems() {
        Map<String, Object> ns = CanvasContext.build(sampleLive(), sampleConfig(), sampleSubmission());
        String out = evaluator.interpolate(
                "${count(filterEquals(groups['members'], 'member-parts', 'Vo / Gt'))}", ns);
        assertEquals("1", out);
    }

    @Test
    void nestedGroupsAreReachable() {
        // members[0] has a nested 'mics' group; verify items[0].group('mics').count works.
        FormBlockResponse memberName = leaf("member-name", "SHORT_TEXT", "氏名");
        FormBlockResponse micName = leaf("mic-name", "SHORT_TEXT", "マイク名");
        FormBlockResponse mics = group("mics", "マイク", List.of(micName));
        FormBlockResponse members = group("members", "出演者", List.of(memberName, mics));
        SettingSheetConfigResponse cfg = new SettingSheetConfigResponse("t", "", "送信", true, List.of(members));

        FieldAnswerResponse answer = new FieldAnswerResponse("members", List.of(), List.of(
                new GroupItemResponse(null, List.of(
                        new FieldAnswerResponse("member-name", List.of("田中"), List.of()),
                        new FieldAnswerResponse("mics", List.of(), List.of(
                                new GroupItemResponse(null, List.of(
                                        new FieldAnswerResponse("mic-name", List.of("SM58"), List.of()))),
                                new GroupItemResponse(null, List.of(
                                        new FieldAnswerResponse("mic-name", List.of("e835"), List.of())))))))));
        PublicSettingSheetSubmissionDetailResponse sub = new PublicSettingSheetSubmissionDetailResponse(
                UUID.randomUUID(), "Band", "完成", LocalDateTime.of(2026, 1, 1, 0, 0), 0L,
                List.of(answer), List.of());

        Map<String, Object> ns = CanvasContext.build(sampleLive(), cfg, sub);
        String name = evaluator.interpolate(
                "${groups['members'].items[0].field('member-name').value}", ns);
        assertEquals("田中", name);
        String micCount = evaluator.interpolate(
                "${count(groups['members'].items[0].group('mics'))}", ns);
        assertEquals("2", micCount);
        String micJoin = evaluator.interpolate(
                "${joinField(groups['members'].items[0].group('mics'), 'mic-name', ', ')}", ns);
        assertEquals("SM58, e835", micJoin);
    }

    @Test
    void interpolatesPlainTemplate() {
        Map<String, Object> ns = new HashMap<>();
        ns.put("name", "World");
        assertEquals("Hello World!", evaluator.interpolate("Hello ${name}!", ns));
    }

    @Test
    void helpersResolveInDefaultNamespace() {
        Map<String, Object> ns = new HashMap<>();
        ns.put("flag", "true");
        assertEquals("○", evaluator.interpolate("${boolMark(flag)}", ns));
        ns.put("parts", List.of("Vo", "Gt"));
        assertEquals("Vo / Gt", evaluator.interpolate("${join(parts, ' / ')}", ns));
    }

    @Test
    void contextExposesFieldsAndGroups() {
        LiveResponse live = sampleLive();
        SettingSheetConfigResponse config = sampleConfig();
        PublicSettingSheetSubmissionDetailResponse submission = sampleSubmission();

        Map<String, Object> ns = CanvasContext.build(live, config, submission);
        assertNotNull(ns.get("live"));
        assertNotNull(ns.get("submission"));

        @SuppressWarnings("unchecked")
        Map<String, CanvasContext.FieldRef> fields = (Map<String, CanvasContext.FieldRef>) ns.get("fields");
        assertEquals("KingGnu", fields.get("band-name").getValue());

        @SuppressWarnings("unchecked")
        Map<String, CanvasContext.GroupRef> groups = (Map<String, CanvasContext.GroupRef>) ns.get("groups");
        assertEquals(2, groups.get("members").getItems().size());
        assertEquals("田中",
                evaluator.interpolate("${groups['members'].items[0].field('member-name').value}", ns));
    }

    @Test
    void defaultCanvasFromConfigIncludesGroupTable() {
        DefaultCanvasFactory factory = new DefaultCanvasFactory();
        CanvasSchema.CanvasDocument doc = factory.build(sampleConfig());
        assertNotNull(doc);
        assertNotNull(doc.page());
        assertFalse(doc.elements().isEmpty());
        boolean hasTable = doc.elements().stream()
                .anyMatch(e -> e instanceof CanvasSchema.CanvasElement.TableElement);
        assertTrue(hasTable, "default canvas should include at least one table element");
    }

    @Test
    void mapJoinComposesFieldsWithConditional() {
        Map<String, Object> ns = CanvasContext.build(sampleLive(), sampleConfig(), sampleSubmission());
        String out = evaluator.interpolate(
                "${mapJoin(groups['members'].items, (m) -> m.field('member-name').value + ' ' + (m.field('member-parts').value == 'Vo / Gt' ? '〇' : '×'), ' / ')}", ns);
        assertEquals("田中 〇 / 佐藤 ×", out);
    }

    @Test
    void filterPredicateRetainsMatchingItems() {
        Map<String, Object> ns = CanvasContext.build(sampleLive(), sampleConfig(), sampleSubmission());
        String out = evaluator.interpolate(
                "${count(filter(groups['members'].items, (m) -> m.field('member-parts').value == 'Vo / Gt'))}", ns);
        assertEquals("1", out);
    }

    @Test
    void findReturnsFirstMatchingItem() {
        Map<String, Object> ns = CanvasContext.build(sampleLive(), sampleConfig(), sampleSubmission());
        String out = evaluator.interpolate(
                "${find(groups['members'].items, (m) -> m.field('member-name').value == '田中').field('member-name').value}", ns);
        assertEquals("田中", out);
    }

    @Test
    void mapJoinTraversesNestedGroups() {
        FormBlockResponse micName = leaf("mic-name", "SHORT_TEXT", "マイク名");
        FormBlockResponse mics = group("mics", "マイク", List.of(micName));
        FormBlockResponse memberName = leaf("member-name", "SHORT_TEXT", "氏名");
        FormBlockResponse members = group("members", "出演者", List.of(memberName, mics));
        SettingSheetConfigResponse cfg = new SettingSheetConfigResponse("t", "", "送信", true, List.of(members));

        FieldAnswerResponse answer = new FieldAnswerResponse("members", List.of(), List.of(
                new GroupItemResponse(null, List.of(
                        new FieldAnswerResponse("member-name", List.of("田中"), List.of()),
                        new FieldAnswerResponse("mics", List.of(), List.of(
                                new GroupItemResponse(null, List.of(
                                        new FieldAnswerResponse("mic-name", List.of("SM58"), List.of()))),
                                new GroupItemResponse(null, List.of(
                                        new FieldAnswerResponse("mic-name", List.of("e835"), List.of())))))))));
        PublicSettingSheetSubmissionDetailResponse sub = new PublicSettingSheetSubmissionDetailResponse(
                UUID.randomUUID(), "Band", "完成", LocalDateTime.of(2026, 1, 1, 0, 0), 0L,
                List.of(answer), List.of());

        Map<String, Object> ns = CanvasContext.build(sampleLive(), cfg, sub);
        String out = evaluator.interpolate(
                "${mapJoin(groups['members'].items, (m) -> mapJoin(m.group('mics').items, (x) -> x.field('mic-name').value, '+'), ' / ')}", ns);
        assertEquals("SM58+e835", out);
    }

    @Test
    void mapJoinWithNewlineSeparatorProducesMultilineOutput() {
        Map<String, Object> ns = CanvasContext.build(sampleLive(), sampleConfig(), sampleSubmission());
        // Use '\\n' in Java so JEXL receives the two-char escape sequence '\n',
        // which JEXL's lexer interprets as a real newline character.
        String out = evaluator.interpolate(
                "${mapJoin(groups['members'].items, (m) -> m.field('member-name').value, '\\n')}", ns);
        assertEquals("田中\n佐藤", out);
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
                LocalDateTime.of(2026, 6, 20, 12, 0), 0L, List.of(bandName, memberItems), List.of());
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

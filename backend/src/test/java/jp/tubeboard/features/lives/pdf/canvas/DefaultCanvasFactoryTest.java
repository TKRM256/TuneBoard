package jp.tubeboard.features.lives.pdf.canvas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

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
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.service.config.FormBuilderHelper;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigServiceHelper;

/**
 * 既定フォームから組み立てた初期レイアウトが、実際の提出内容で意図した文字列になるかを見る。
 * 列の式は JEXL でその場評価されるので、式が壊れていればここで落ちる。
 */
class DefaultCanvasFactoryTest {

    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();
    private final DefaultCanvasFactory factory = new DefaultCanvasFactory();
    private final SettingSheetConfigResponse config = defaultConfig();
    private final Map<String, Object> namespace = CanvasContext.build(live(), config, submission());

    @Test
    void 出演者の表は氏名と担当パートだけを並べる() {
        List<TableColumn> columns = tableFor("members").columns();
        assertEquals(List.of("No", "氏名", "担当パート"), columns.stream().map(TableColumn::header).toList());
    }

    @Test
    void 代表者の氏名にだけ注記が付く() {
        TableColumn name = column(tableFor("members"), "氏名");
        List<CanvasContext.ItemRef> items = itemsOf("members");

        assertEquals("田中太郎(代表者)", cell(name, items.get(0)));
        assertEquals("佐藤三郎", cell(name, items.get(1)));
    }

    @Test
    void 担当パートは選んだ分がそのまま並ぶ() {
        TableColumn parts = column(tableFor("members"), "担当パート");
        assertEquals("Vocal / Guitar", cellValue(parts, itemsOf("members").get(0)));
    }

    @Test
    void セットリストの表は曲とMCを同じ列で出し分ける() {
        TableColumn song = column(tableFor("setlist"), "曲 / MC");
        List<CanvasContext.ItemRef> items = itemsOf("setlist");

        assertEquals("夜に駆ける", cell(song, items.get(0)));
        assertEquals("MC", cell(song, items.get(1)));
    }

    @Test
    void 使うマイクは曲でもMCでも出て_メインボーカルに注記が付く() {
        TableColumn mic = column(tableFor("setlist"), "使うマイク");
        List<CanvasContext.ItemRef> items = itemsOf("setlist");

        assertEquals("田中太郎(メイン)\n佐藤三郎", cell(mic, items.get(0)));
        assertEquals("佐藤三郎(メイン)", cell(mic, items.get(1)));
    }

    @Test
    void セットリストには各備考の列が並ぶ() {
        List<String> headers = tableFor("setlist").columns().stream().map(TableColumn::header).toList();
        assertEquals(List.of("No", "曲 / MC", "使うパート", "使うマイク", "PAへの要望", "照明への要望", "備考"), headers);
    }

    @Test
    void 単発項目はKV表にまとまる() {
        CanvasDocument doc = factory.build(config);
        CanvasElement.TableElement kv = doc.elements().stream()
                .filter(CanvasElement.TableElement.class::isInstance)
                .map(CanvasElement.TableElement.class::cast)
                .filter(table -> table.source() instanceof TableSource.FieldsSource)
                .findFirst()
                .orElseThrow();

        TableSource.FieldsSource source = (TableSource.FieldsSource) kv.source();
        assertEquals(List.of("band-name", "submission-status", "detail"),
                source.fields().stream().map(TableSource.FieldRef::fieldId).toList());
    }

    // ───────── helpers ─────────

    private CanvasElement.TableElement tableFor(String groupId) {
        CanvasDocument doc = factory.build(config);
        CanvasElement.TableElement found = doc.elements().stream()
                .filter(CanvasElement.TableElement.class::isInstance)
                .map(CanvasElement.TableElement.class::cast)
                .filter(table -> table.source() instanceof TableSource.GroupSource group
                        && groupId.equals(group.groupId()))
                .findFirst()
                .orElse(null);
        assertNotNull(found, groupId + " の表が見つからない");
        return found;
    }

    private TableColumn column(CanvasElement.TableElement table, String header) {
        return table.columns().stream()
                .filter(column -> header.equals(column.header()))
                .findFirst()
                .orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private List<CanvasContext.ItemRef> itemsOf(String groupId) {
        Map<String, CanvasContext.GroupRef> groups = (Map<String, CanvasContext.GroupRef>) namespace.get("groups");
        return groups.get(groupId).getItems();
    }

    /** CanvasRenderer の GroupRow と同じ束縛で列の式を評価する。 */
    private String cell(TableColumn column, CanvasContext.ItemRef item) {
        Map<String, Object> local = new HashMap<>(namespace);
        CanvasContext.FieldRef ref = item.field(column.fieldId());
        local.put("value", ref.getValue());
        local.put("values", ref.getValues());
        local.put("item", item);
        return evaluator.interpolate(column.format(), local);
    }

    /** 式を持たない列は、その項目の値がそのまま出る。 */
    private String cellValue(TableColumn column, CanvasContext.ItemRef item) {
        return item.field(column.fieldId()).getValue();
    }

    private static SettingSheetConfigResponse defaultConfig() {
        FormBuilderHelper formBuilderHelper = new FormBuilderHelper();
        return new SettingSheetConfigService(
                new SettingSheetConfigServiceHelper(formBuilderHelper), formBuilderHelper)
                .defaultSettingSheetConfig();
    }

    private static LiveResponse live() {
        return new LiveResponse(UUID.randomUUID(), UUID.randomUUID(), "サークル", "token",
                "定期ライブ", LocalDate.of(2026, 8, 1), "渋谷", LocalDateTime.of(2026, 7, 20, 23, 59),
                LiveStatus.PUBLISHED);
    }

    private static PublicSettingSheetSubmissionDetailResponse submission() {
        FieldAnswerResponse members = new FieldAnswerResponse("members", List.of(), List.of(
                new GroupItemResponse(null, List.of(
                        answer("member-name", "田中太郎"),
                        answer("member-representative", "true"),
                        new FieldAnswerResponse("member-parts", List.of("Vocal", "Guitar"), List.of()))),
                new GroupItemResponse(null, List.of(
                        answer("member-name", "佐藤三郎"),
                        answer("member-representative", "false"),
                        answer("member-parts", "Bass")))));

        FieldAnswerResponse setlist = new FieldAnswerResponse("setlist", List.of(), List.of(
                new GroupItemResponse("song-entry", List.of(
                        new FieldAnswerResponse("song", List.of("夜に駆ける", "YOASOBI"), List.of()),
                        new FieldAnswerResponse("song-parts", List.of("Vocal", "Bass"), List.of()),
                        answer("song-note-pa", "リバーブ強めで"),
                        new FieldAnswerResponse("song-mics", List.of(), List.of(
                                new GroupItemResponse(null, List.of(
                                        answer("mic-member", "田中太郎"),
                                        answer("mic-main-vocal", "true"))),
                                new GroupItemResponse(null, List.of(
                                        answer("mic-member", "佐藤三郎"),
                                        answer("mic-main-vocal", "false"))))))),
                new GroupItemResponse("mc-entry", List.of(
                        new FieldAnswerResponse("mc-mics", List.of(), List.of(
                                new GroupItemResponse(null, List.of(
                                        answer("mc-mic-member", "佐藤三郎"),
                                        answer("mc-mic-main", "true")))))))));

        return new PublicSettingSheetSubmissionDetailResponse(
                UUID.randomUUID(), "たぬきバンド", "完成", LocalDateTime.of(2026, 7, 1, 12, 0), 0L,
                List.of(answer("band-name", "たぬきバンド"), answer("submission-status", "完成"),
                        answer("detail", "よろしくお願いします"), members, setlist),
                List.of());
    }

    private static FieldAnswerResponse answer(String fieldId, String value) {
        return new FieldAnswerResponse(fieldId, List.of(value), List.of());
    }
}

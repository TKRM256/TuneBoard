package jp.tubeboard.features.tenants.service.demo;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jp.tubeboard.features.lives.stageplot.icon.IconNode;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.PageBackground;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;

/**
 * 開発用のダミーデータで、会場書式（背景の書式の上に置く要素）を組み立てる。座標は書式の左上からの mm。
 * 枠に合わせる要素は、罫線の枠を渡すと内側に余白を空けて置く（エディタの「枠いっぱい」と同じ）。
 */
final class VenueLayoutBuilder {

    private static final String PAGE_ID = "page-1";
    private static final float PADDING = 0.5f;
    private static final String MARK_COLOR = "#dc2626";
    private static final String TEXT_COLOR = "#111827";
    private static final List<IconNode> CHECK = List.of(new IconNode("path", Map.of("d", "M20 6 9 17l-5-5")));

    private final List<VenueElement> elements = new ArrayList<>();
    private int counter;

    /** 罫線で囲まれた枠（mm）。 */
    record Cell(float left, float top, float right, float bottom) {
    }

    /** 単発の項目の値を、枠いっぱいに書く。 */
    VenueLayoutBuilder field(String fieldId, Cell cell, float fontSizePt, boolean shrinkToFit, String verticalAlign) {
        Cell box = inner(cell);
        elements.add(new VenueElement.FieldElement(id(), PAGE_ID, box.left(), box.top(), width(box), height(box), null,
                fieldId, fontSizePt, false, "left", verticalAlign, TEXT_COLOR, shrinkToFit));
        return this;
    }

    /** 式を含む文字を、枠いっぱいに書く。 */
    VenueLayoutBuilder text(String content, Cell cell, float fontSizePt, String align, String condition) {
        Cell box = inner(cell);
        elements.add(new VenueElement.TextElement(id(), PAGE_ID, box.left(), box.top(), width(box), height(box),
                condition, content, fontSizePt, false, align, "middle", TEXT_COLOR, true));
        return this;
    }

    /**
     * 表の欄：行（上から）×列のマスごとに、何件目の値を書く式を置く（「表の欄に項目を並べる」と同じ）。
     *
     * @param rows    行の境目（上から。行数 + 1 個）
     * @param columns 列ごとの { 左, 右 } と、その列に書く式（{@code %d} に何件目が入る。0 始まり）
     */
    VenueLayoutBuilder table(float[] rows, List<Column> columns, float fontSizePt) {
        for (int r = 0; r + 1 < rows.length; r++) {
            for (Column column : columns) {
                text(column.expression().formatted(r), new Cell(column.left(), rows[r], column.right(), rows[r + 1]),
                        fontSizePt, "left", null);
            }
        }
        return this;
    }

    record Column(float left, float right, String expression) {
    }

    /** □ の枠にぴったり ✓ を置く（条件が真のときだけ出る）。 */
    VenueLayoutBuilder check(float left, float top, float size, String condition) {
        elements.add(new VenueElement.IconElement(id(), PAGE_ID, left, top, size, size, condition, "check", CHECK,
                MARK_COLOR, 2f));
        return this;
    }

    /** 選択肢の文字を ○ で囲む（条件が真のときだけ出る）。 */
    VenueLayoutBuilder circle(float left, float top, float right, float bottom, String condition) {
        elements.add(new VenueElement.ShapeElement(id(), PAGE_ID, left, top, right - left, bottom - top, condition,
                "ellipse", MARK_COLOR, 1f, null));
        return this;
    }

    /** ステージ配置図を枠いっぱいに描く。 */
    VenueLayoutBuilder stagePlot(String fieldId, Cell cell, String mode) {
        Cell box = inner(cell);
        elements.add(new VenueElement.StagePlotElement(id(), PAGE_ID, box.left(), box.top(), width(box), height(box),
                null, fieldId, null, null, mode, 7f));
        return this;
    }

    VenueFormDocument build(UUID assetId, float widthMm, float heightMm) {
        VenuePage page = new VenuePage(PAGE_ID, widthMm, heightMm, new PageBackground(assetId, 0));
        return new VenueFormDocument(List.of(page), List.copyOf(elements));
    }

    // 表示条件の式（フロントの「かんたん設定」で作るものと同じ形）

    static String includes(String fieldId, String option) {
        return "${contains(fields['%s'].values, '%s')}".formatted(fieldId, option);
    }

    static String isTrue(String fieldId, boolean expected) {
        return "${fields['%s'].value == '%s'}".formatted(fieldId, expected);
    }

    /** グループのいずれかの件で、その項目がその選択肢を含む。 */
    static String anyItemIncludes(String groupId, String fieldId, String option) {
        return "${count(filter(groups['%s'].items, (m) -> contains(m.field('%s').values, '%s'))) > 0}"
                .formatted(groupId, fieldId, option);
    }

    /** 何件目（0 始まりの %d）の、その項目の値。 */
    static String itemValue(String groupId, String fieldId) {
        return "${groups['" + groupId + "'].items[%d].field('" + fieldId + "').value}";
    }

    private static Cell inner(Cell cell) {
        return new Cell(cell.left() + PADDING, cell.top() + PADDING, cell.right() - PADDING, cell.bottom() - PADDING);
    }

    private static float width(Cell cell) {
        return round(cell.right() - cell.left());
    }

    private static float height(Cell cell) {
        return round(cell.bottom() - cell.top());
    }

    private static float round(float value) {
        return Math.round(value * 100) / 100f;
    }

    private String id() {
        return "demo-" + (++counter);
    }
}

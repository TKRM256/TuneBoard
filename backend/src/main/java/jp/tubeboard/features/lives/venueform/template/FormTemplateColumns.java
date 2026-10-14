package jp.tubeboard.features.lives.venueform.template;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.DefaultCanvasColumns;

/**
 * 繰り返しの表の列。1 項目 1 列で並べ、幅に収まらない分は最後の「その他」の列に「項目名: 値」で改行して並べる。
 * 中の繰り返し（使うマイクなど）は、1 件ずつを「、」でつないで 1 列にする。
 */
final class FormTemplateColumns {

    static final float INDEX_MM = 9f;
    /** これより細い列は読めないので、その他にまとめる。 */
    static final float MIN_COLUMN_MM = 24f;
    private static final String REST_HEADER = "その他";
    private static final float REST_WEIGHT = 2.5f;
    /** 中の繰り返しで 1 件に並べる項目の数。 */
    private static final int CHILD_FIELD_LIMIT = 3;
    /** 中の繰り返しをたどる深さ。 */
    private static final int MAX_DEPTH = 3;

    private static final String BOOLEAN = "BOOLEAN";
    private static final String YES_NO = "value == 'true' ? 'はい' : (value == 'false' ? 'いいえ' : value)";

    private record Column(String header, String fieldId, String expression, float weight) {
    }

    private FormTemplateColumns() {
    }

    /** 1 項目 1 列で並べたときの列の数（番号の列を除く）。 */
    static int naturalCount(FormBlockResponse group) {
        return DefaultCanvasColumns.forGroup(group) != null ? 0 : columnsOf(group).size();
    }

    static boolean fits(FormBlockResponse group, float widthMm) {
        return naturalCount(group) <= capacity(widthMm);
    }

    static List<TableColumn> of(FormBlockResponse group, float widthMm) {
        List<TableColumn> special = DefaultCanvasColumns.forGroup(group);
        if (special != null) {
            return special;
        }
        List<Column> columns = columnsOf(group);
        int capacity = capacity(widthMm);
        if (columns.size() > capacity) {
            List<Column> kept = new ArrayList<>(columns.subList(0, capacity - 1));
            kept.add(rest(columns.subList(capacity - 1, columns.size())));
            columns = kept;
        }
        float indexRatio = Math.min(0.2f, INDEX_MM / widthMm);
        float totalWeight = (float) columns.stream().mapToDouble(Column::weight).sum();
        List<TableColumn> out = new ArrayList<>();
        out.add(DefaultCanvasColumns.indexColumn(indexRatio));
        for (Column column : columns) {
            float ratio = (1f - indexRatio) * column.weight() / totalWeight;
            String format = column.expression() == null ? null : "${" + column.expression() + "}";
            out.add(new TableColumn(uuid(), column.header(), column.fieldId(), ratio, "left", format, null, null));
        }
        return out;
    }

    /** はい / いいえ の項目があれば、true / false をそのまま出さない式。無ければ null（値をそのまま出す）。 */
    static String valueFormat(List<FormBlockResponse> fields) {
        return fields.stream().anyMatch(field -> BOOLEAN.equals(field.type())) ? "${" + YES_NO + "}" : null;
    }

    private static int capacity(float widthMm) {
        return Math.max(1, (int) ((widthMm - INDEX_MM) / MIN_COLUMN_MM));
    }

    private static List<Column> columnsOf(FormBlockResponse group) {
        List<Column> columns = new ArrayList<>();
        for (FormBlockResponse field : FormTemplateContent.leafFields(group)) {
            String expression = BOOLEAN.equals(field.type()) ? YES_NO.replace("value", "item.field('" + field.id() + "').value") : null;
            columns.add(new Column(headerOf(field), field.id(), safeId(field.id()) ? expression : null, weightOf(field.type())));
        }
        for (FormBlockResponse child : FormTemplateContent.childGroups(group)) {
            String expression = childExpression(child);
            if (expression != null) {
                columns.add(new Column(headerOf(child), "", expression, 1.5f));
            }
        }
        return columns;
    }

    /** 収まらない項目を 1 列にまとめる。1 項目 1 行で「項目名: 値」。 */
    private static Column rest(List<Column> columns) {
        List<String> lines = new ArrayList<>();
        for (Column column : columns) {
            if (column.expression() == null && !safeId(column.fieldId())) continue;
            String value = column.expression() != null ? column.expression() : "item.field('" + column.fieldId() + "').value";
            lines.add("'" + literal(column.header()) + ": ' + (" + value + ")");
        }
        return new Column(REST_HEADER, "", String.join(" + '\\n' + ", lines), REST_WEIGHT);
    }

    private static String childExpression(FormBlockResponse child) {
        return listExpression(child, "item", 1);
    }

    /** 中の繰り返しの全件を「、」でつなぐ。さらに中の繰り返しは、その件の後ろに括弧で付ける。 */
    private static String listExpression(FormBlockResponse group, String parent, int depth) {
        if (!safeId(group.id()) || depth > MAX_DEPTH) return null;
        String item = "x" + depth;
        List<String> parts = new ArrayList<>();
        FormTemplateContent.leafFields(group).stream()
                .filter(field -> safeId(field.id()))
                .limit(CHILD_FIELD_LIMIT)
                .forEach(field -> parts.add(item + ".field('" + field.id() + "').value"));
        for (FormBlockResponse inner : FormTemplateContent.childGroups(group)) {
            String list = listExpression(inner, item, depth + 1);
            if (list != null) parts.add("(" + list + " == '' ? '' : '(' + " + list + " + ')')");
        }
        if (parts.isEmpty()) return null;
        return "mapJoin(" + parent + ".group('" + group.id() + "').items, (" + item + ") -> "
                + String.join(" + ' ' + ", parts) + ", '、')";
    }

    private static float weightOf(String type) {
        return switch (type) {
            case "LONG_TEXT" -> 2f;
            case "SONG" -> 1.6f;
            case "MULTI_SELECT", "CHECKBOX" -> 1.4f;
            default -> 1f;
        };
    }

    private static String headerOf(FormBlockResponse block) {
        String label = FormTemplateContent.labelOf(block);
        return label == null ? "" : label;
    }

    /** 式の中の文字列にそのまま入れられる形にする。 */
    private static String literal(String text) {
        return text.replace("\\", "\\\\").replace("'", "\\'");
    }

    /** 式に埋め込むので、引用符などを含む ID は使わない（画面で作る ID は英数字とハイフンだけ）。 */
    private static boolean safeId(String id) {
        return id != null && id.matches("[A-Za-z0-9_\\-]+");
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }
}

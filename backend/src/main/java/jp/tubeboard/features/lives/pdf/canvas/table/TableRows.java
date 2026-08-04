package jp.tubeboard.features.lives.pdf.canvas.table;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.pdf.canvas.CanvasContext;
import jp.tubeboard.features.lives.pdf.canvas.CanvasContext.GroupRef;
import jp.tubeboard.features.lives.pdf.canvas.CanvasContext.ItemRef;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.pdf.canvas.ExpressionEvaluator;

/** Resolves the rows a table element expands into, and the text of each cell. */
public final class TableRows {

    private TableRows() {
    }

    public interface RowData {
        String cellText(TableColumn column, ExpressionEvaluator evaluator, Map<String, Object> namespace);
    }

    public static List<RowData> collect(CanvasElement.TableElement table, Map<String, Object> namespace) {
        TableSource src = table.source();
        if (src instanceof TableSource.GroupSource g) {
            Object groups = namespace.get("groups");
            if (groups instanceof Map<?, ?> map && map.get(g.groupId()) instanceof GroupRef gr) {
                return gr.getItems().stream()
                        .map((ItemRef item) -> (RowData) new GroupRow(item))
                        .toList();
            }
            return List.of();
        }
        if (src instanceof TableSource.FieldsSource fs) {
            return fs.fields() == null ? List.of()
                    : fs.fields().stream()
                            .map(f -> (RowData) new FieldRow(f.fieldId(), f.fallbackLabel()))
                            .toList();
        }
        return List.of();
    }

    private record GroupRow(ItemRef item) implements RowData {
        @Override
        public String cellText(TableColumn column, ExpressionEvaluator evaluator, Map<String, Object> namespace) {
            if ("__index__".equals(column.fieldId())) {
                return String.valueOf(item.getIndex() + 1);
            }
            CanvasContext.FieldRef ref = item.field(column.fieldId());
            if (!isBlank(column.format())) {
                Map<String, Object> ns = new HashMap<>(namespace);
                ns.put("value", ref.getValue());
                ns.put("values", ref.getValues());
                ns.put("item", item);
                return evaluator.interpolate(column.format(), ns);
            }
            return ref.getValue();
        }
    }

    private record FieldRow(String fieldId, String fallbackLabel) implements RowData {
        @Override
        public String cellText(TableColumn column, ExpressionEvaluator evaluator, Map<String, Object> namespace) {
            if ("__label__".equals(column.fieldId())) {
                return fallbackLabel != null ? fallbackLabel : fieldId;
            }
            // Default = the value of the row's referenced field
            Object fields = namespace.get("fields");
            if (fields instanceof Map<?, ?> map && map.get(fieldId) instanceof CanvasContext.FieldRef fr) {
                if (!isBlank(column.format())) {
                    Map<String, Object> local = new HashMap<>(namespace);
                    local.put("value", fr.getValue());
                    local.put("values", fr.getValues());
                    return evaluator.interpolate(column.format(), local);
                }
                return fr.getValue();
            }
            return "";
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}

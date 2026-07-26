package jp.tubeboard.features.lives.pdf.canvas;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasPage;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;

/**
 * Builds a sensible default canvas from a form configuration. Used when the
 * client does not supply one (e.g. from a non-editor context).
 */
@Component
public class DefaultCanvasFactory {

    private static final float PAGE_HEIGHT_MM = 210f; // A4 landscape
    /** 上段（単発項目のKV表・最初の繰り返しグループ）の高さ。 */
    private static final float TOP_ROW_HEIGHT_MM = 46f;

    public CanvasDocument build(SettingSheetConfigResponse config) {
        List<CanvasElement> elements = new ArrayList<>();
        float y = 8f;
        float pageWidthMm = 297f; // A4 landscape

        elements.add(new CanvasElement.TextElement(uuid(), 8f, y, pageWidthMm - 16f, 12f,
                "${live.name}", 18f, true, false, "left", "middle", "#1f2937",
                null, null, null));
        y += 14f;
        elements.add(new CanvasElement.TextElement(uuid(), 8f, y, pageWidthMm - 16f, 6f,
                "${formatDate(live.date, 'yyyy/M/d')}  /  ${live.location}  /  ${live.tenantName}", 9f,
                false, false, "left", "middle", "#6b7280", null, null, null));
        y += 8f;
        elements.add(new CanvasElement.TextElement(uuid(), 8f, y, pageWidthMm - 16f, 5f,
                "提出日時: ${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}", 9f,
                false, false, "left", "middle", "#374151", null, null, null));
        y += 8f;
        elements.add(new CanvasElement.DividerElement(uuid(), 8f, y, pageWidthMm - 16f, 1f,
                "#d1d5db", 0.6f));
        y += 4f;

        if (config != null && config.blocks() != null) {
            List<FormBlockResponse> infoFields = collectInfoFields(config.blocks());
            List<FormBlockResponse> groups = collectGroups(config.blocks()).stream()
                    .filter(group -> !leafFieldsOf(group).isEmpty())
                    .toList();

            float contentW = pageWidthMm - 16f;
            float halfW = contentW * 0.5f - 2f;
            FormBlockResponse firstGroup = groups.isEmpty() ? null : groups.get(0);

            // 上段は「単発項目のKV表」と「最初の繰り返しグループ」を左右に並べ、
            // 残りのグループ（セットリストなど）は下段に幅いっぱいで積む。
            if (!infoFields.isEmpty()) {
                List<TableSource.FieldRef> refs = infoFields.stream()
                        .map(b -> new TableSource.FieldRef(b.id(), b.label()))
                        .toList();
                List<TableColumn> cols = List.of(
                        new TableColumn(uuid(), "項目", "__label__", 0.3f, "left", null),
                        new TableColumn(uuid(), "内容", null, 0.7f, "left", null));
                elements.add(new CanvasElement.TableElement(uuid(), 8f, y,
                        firstGroup != null ? halfW : contentW, TOP_ROW_HEIGHT_MM,
                        new TableSource.FieldsSource(refs), cols, true, 9f, "#e5edf6", "#d1d5db", false));
            }

            if (firstGroup != null) {
                elements.add(groupTable(firstGroup,
                        infoFields.isEmpty() ? 8f : 8f + contentW * 0.5f + 2f, y,
                        infoFields.isEmpty() ? contentW : halfW, TOP_ROW_HEIGHT_MM));
            }

            float bottomTop = y + TOP_ROW_HEIGHT_MM + 4f;
            float bottomHeight = PAGE_HEIGHT_MM - 8f - bottomTop;
            int restCount = groups.size() - 1;
            for (int i = 0; i < restCount; i++) {
                float each = bottomHeight / restCount;
                elements.add(groupTable(groups.get(i + 1), 8f, bottomTop + each * i, contentW, each - 4f));
            }
        }

        CanvasPage page = new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 9f);
        return new CanvasDocument(page, elements);
    }

    private CanvasElement.TableElement groupTable(FormBlockResponse group, float xMm, float yMm,
            float wMm, float hMm) {
        List<TableColumn> columns = DefaultCanvasColumns.forGroup(group);
        if (columns == null) {
            columns = genericGroupColumns(group);
        }
        return new CanvasElement.TableElement(uuid(), xMm, yMm, wMm, hMm,
                new TableSource.GroupSource(group.id(), group.label()), columns, true, 9f,
                "#e5edf6", "#d1d5db", false);
    }

    private List<TableColumn> genericGroupColumns(FormBlockResponse group) {
        List<FormBlockResponse> leafFields = leafFieldsOf(group);
        List<TableColumn> columns = new ArrayList<>();
        columns.add(DefaultCanvasColumns.indexColumn(0.08f));
        float colWidth = 0.92f / leafFields.size();
        for (FormBlockResponse field : leafFields) {
            columns.add(new TableColumn(uuid(), field.label(), field.id(), colWidth, "left", null));
        }
        return columns;
    }

    private List<FormBlockResponse> collectInfoFields(List<FormBlockResponse> blocks) {
        List<FormBlockResponse> out = new ArrayList<>();
        if (blocks == null) return out;
        for (FormBlockResponse b : blocks) {
            if (b == null) continue;
            if ("SECTION".equals(b.type())) {
                out.addAll(collectInfoFields(b.fields()));
            } else if (!"REPEATABLE_GROUP".equals(b.type())) {
                out.add(b);
            }
        }
        return out;
    }

    private List<FormBlockResponse> collectGroups(List<FormBlockResponse> blocks) {
        List<FormBlockResponse> out = new ArrayList<>();
        if (blocks == null) return out;
        for (FormBlockResponse b : blocks) {
            if (b == null) continue;
            if ("REPEATABLE_GROUP".equals(b.type())) {
                out.add(b);
            } else if ("SECTION".equals(b.type())) {
                out.addAll(collectGroups(b.fields()));
            }
        }
        return out;
    }

    private List<FormBlockResponse> leafFieldsOf(FormBlockResponse group) {
        List<FormBlockResponse> sources = group.variants() != null && !group.variants().isEmpty()
                ? group.variants().get(0).fields()
                : group.fields();
        if (sources == null) return List.of();
        return sources.stream()
                .filter(b -> b != null && !"SECTION".equals(b.type()) && !"REPEATABLE_GROUP".equals(b.type()))
                .limit(6)
                .toList();
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }
}

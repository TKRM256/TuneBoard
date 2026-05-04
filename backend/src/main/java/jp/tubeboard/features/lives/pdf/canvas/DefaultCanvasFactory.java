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
            List<FormBlockResponse> groups = collectGroups(config.blocks());

            if (!infoFields.isEmpty()) {
                List<TableSource.FieldRef> refs = infoFields.stream()
                        .map(b -> new TableSource.FieldRef(b.id(), b.label()))
                        .toList();
                List<TableColumn> cols = List.of(
                        new TableColumn(uuid(), "項目", "__label__", 0.3f, "left", null),
                        new TableColumn(uuid(), "内容", null, 0.7f, "left", null));
                elements.add(new CanvasElement.TableElement(uuid(), 8f, y, (pageWidthMm - 16f) * 0.5f - 2f,
                        Math.max(20f, refs.size() * 7f),
                        new TableSource.FieldsSource(refs), cols, true, 9f, "#e5edf6", "#d1d5db", false));
            }

            float groupX = !infoFields.isEmpty() ? 8f + (pageWidthMm - 16f) * 0.5f + 2f : 8f;
            float groupW = !infoFields.isEmpty() ? (pageWidthMm - 16f) * 0.5f - 2f : pageWidthMm - 16f;
            float groupY = y;

            for (FormBlockResponse group : groups) {
                List<FormBlockResponse> leafFields = leafFieldsOf(group);
                if (leafFields.isEmpty()) continue;
                List<TableColumn> cols = new ArrayList<>();
                cols.add(new TableColumn(uuid(), "No", "__index__", 0.08f, "center", null));
                float colWidth = 0.92f / leafFields.size();
                for (FormBlockResponse f : leafFields) {
                    cols.add(new TableColumn(uuid(), f.label(), f.id(), colWidth, "left", null));
                }
                elements.add(new CanvasElement.TableElement(uuid(), groupX, groupY, groupW,
                        Math.max(40f, leafFields.size() * 6f + 16f),
                        new TableSource.GroupSource(group.id(), group.label()), cols, true, 9f,
                        "#e5edf6", "#d1d5db", false));
                groupY += 50f;
                groupX = 8f;
                groupW = pageWidthMm - 16f;
            }
        }

        CanvasPage page = new CanvasPage(PdfPaperSize.A4, PdfOrientation.LANDSCAPE, 8f, 9f);
        return new CanvasDocument(page, elements);
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

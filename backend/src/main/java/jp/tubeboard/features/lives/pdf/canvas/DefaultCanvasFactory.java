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

    private static final PdfPaperSize DEFAULT_PAPER_SIZE = PdfPaperSize.B4;
    private static final PdfOrientation DEFAULT_ORIENTATION = PdfOrientation.LANDSCAPE;
    private static final float MARGIN_MM = 8f;
    /** 用紙を変えてもレイアウトが追従するよう、寸法は用紙設定から導出する。 */
    private static final float PAGE_WIDTH_MM = DEFAULT_ORIENTATION == PdfOrientation.LANDSCAPE
            ? DEFAULT_PAPER_SIZE.heightMm()
            : DEFAULT_PAPER_SIZE.widthMm();
    private static final float PAGE_HEIGHT_MM = DEFAULT_ORIENTATION == PdfOrientation.LANDSCAPE
            ? DEFAULT_PAPER_SIZE.widthMm()
            : DEFAULT_PAPER_SIZE.heightMm();
    /** 上段（単発項目のKV表・最初の繰り返しグループ）が本文領域に占める割合。 */
    private static final float TOP_ROW_RATIO = 0.3f;

    public CanvasDocument build(SettingSheetConfigResponse config) {
        List<CanvasElement> elements = new ArrayList<>();
        float y = MARGIN_MM;
        float pageWidthMm = PAGE_WIDTH_MM;
        float contentWidthMm = pageWidthMm - MARGIN_MM * 2f;

        elements.add(new CanvasElement.TextElement(uuid(), MARGIN_MM, y, contentWidthMm, 12f,
                "${live.name}", 18f, true, false, "left", "middle", "#1f2937",
                null, null, null));
        y += 14f;
        elements.add(new CanvasElement.TextElement(uuid(), MARGIN_MM, y, contentWidthMm, 6f,
                "${formatDate(live.date, 'yyyy/M/d')}  /  ${live.location}  /  ${live.tenantName}", 9f,
                false, false, "left", "middle", "#6b7280", null, null, null));
        y += 8f;
        elements.add(new CanvasElement.TextElement(uuid(), MARGIN_MM, y, contentWidthMm, 5f,
                "提出日時: ${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}", 9f,
                false, false, "left", "middle", "#374151", null, null, null));
        y += 8f;
        elements.add(new CanvasElement.DividerElement(uuid(), MARGIN_MM, y, contentWidthMm, 1f,
                "#d1d5db", 0.6f));
        y += 4f;

        if (config != null && config.blocks() != null) {
            List<FormBlockResponse> infoFields = collectInfoFields(config.blocks());
            List<FormBlockResponse> groups = collectGroups(config.blocks()).stream()
                    .filter(group -> !leafFieldsOf(group).isEmpty())
                    .toList();

            float contentW = contentWidthMm;
            float halfW = contentW * 0.5f - 2f;
            FormBlockResponse firstGroup = groups.isEmpty() ? null : groups.get(0);
            // ヘッダーを描き終えた位置から下が本文領域。その一部を上段に割り当てる
            float topRowHeightMm = Math.round((PAGE_HEIGHT_MM - MARGIN_MM - y) * TOP_ROW_RATIO);

            // 上段は「単発項目のKV表」と「最初の繰り返しグループ」を左右に並べ、
            // 残りのグループ（セットリストなど）は下段に幅いっぱいで積む。
            if (!infoFields.isEmpty()) {
                List<TableSource.FieldRef> refs = infoFields.stream()
                        .map(b -> new TableSource.FieldRef(b.id(), b.label()))
                        .toList();
                List<TableColumn> cols = List.of(
                        new TableColumn(uuid(), "項目", "__label__", 0.3f, "left", null, null, null),
                        new TableColumn(uuid(), "内容", null, 0.7f, "left", null, null, null));
                elements.add(new CanvasElement.TableElement(uuid(), MARGIN_MM, y,
                        firstGroup != null ? halfW : contentW, topRowHeightMm,
                        new TableSource.FieldsSource(refs), cols, true, 9f, "#e5edf6", "#d1d5db", false, true));
            }

            if (firstGroup != null) {
                elements.add(groupTable(firstGroup,
                        infoFields.isEmpty() ? MARGIN_MM : MARGIN_MM + contentW * 0.5f + 2f, y,
                        infoFields.isEmpty() ? contentW : halfW, topRowHeightMm));
            }

            float bottomTop = y + topRowHeightMm + 4f;
            float bottomHeight = PAGE_HEIGHT_MM - MARGIN_MM - bottomTop;
            int restCount = groups.size() - 1;
            for (int i = 0; i < restCount; i++) {
                float each = bottomHeight / restCount;
                elements.add(groupTable(groups.get(i + 1), MARGIN_MM, bottomTop + each * i, contentW, each - 4f));
            }
        }

        CanvasPage page = new CanvasPage(DEFAULT_PAPER_SIZE, DEFAULT_ORIENTATION, MARGIN_MM, 9f);
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
                "#e5edf6", "#d1d5db", false, true);
    }

    private List<TableColumn> genericGroupColumns(FormBlockResponse group) {
        List<FormBlockResponse> leafFields = leafFieldsOf(group);
        List<TableColumn> columns = new ArrayList<>();
        columns.add(DefaultCanvasColumns.indexColumn(0.08f));
        float colWidth = 0.92f / leafFields.size();
        for (FormBlockResponse field : leafFields) {
            columns.add(new TableColumn(uuid(), field.label(), field.id(), colWidth, "left", null, null, null));
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

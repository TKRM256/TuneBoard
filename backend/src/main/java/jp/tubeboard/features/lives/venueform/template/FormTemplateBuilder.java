package jp.tubeboard.features.lives.venueform.template;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;
import jp.tubeboard.features.lives.venueform.template.FormTemplateContent.Unit;

/**
 * フォームの項目を、指定した用紙の大きさに合わせて機械的に並べた書式を作る。
 *
 * <p>上にライブ名などの見出しを置き、その下にフォームの順で塊を積む。幅の広い用紙では 2 段に分け、
 * 低いほうの段に積む（列の多い表だけは幅いっぱい）。ページに収まらない塊は次のページから始める。
 * 表は行が増えると伸びて次のページに続くので、ここでは最初に見える高さだけを決める。
 */
@Component
public class FormTemplateBuilder {

    /** 用紙の指定が無いとき（書式を選ばずに出力するときなど）は B4 横。 */
    public static final float DEFAULT_WIDTH_MM = 364f;
    public static final float DEFAULT_HEIGHT_MM = 257f;
    private static final float MIN_PAPER_MM = 90f;
    private static final float MAX_PAPER_MM = 1200f;

    private static final float MARGIN_MM = 10f;
    private static final float GAP_MM = 4f;
    private static final float COLUMN_GAP_MM = 6f;
    private static final float TWO_COLUMNS_MIN_WIDTH_MM = 240f;
    private static final float HEADING_MM = 7f;
    private static final float ROW_MM = 6.5f;
    private static final float HEADER_ROW_MM = 7f;
    private static final int GROUP_ROWS = 3;
    private static final int MAX_GROUP_ROWS = 12;
    private static final float STAGE_RATIO = 0.6f;
    private static final float MIN_STAGE_MM = 40f;

    private static final String TEXT_COLOR = "#1f2937";
    private static final String SUB_COLOR = "#6b7280";
    private static final String HEADER_FILL = "#e5edf6";
    private static final String BORDER = "#d1d5db";

    public VenueFormDocument build(SettingSheetConfigResponse config, Float widthMm, Float heightMm) {
        Layout layout = new Layout(paper(widthMm, DEFAULT_WIDTH_MM), paper(heightMm, DEFAULT_HEIGHT_MM));
        layout.header();
        for (Unit unit : FormTemplateContent.of(config)) {
            layout.place(unit);
        }
        return new VenueFormDocument(List.copyOf(layout.pages), List.copyOf(layout.elements));
    }

    private static float paper(Float value, float fallback) {
        if (value == null || !Float.isFinite(value)) return fallback;
        return Math.max(MIN_PAPER_MM, Math.min(MAX_PAPER_MM, value));
    }

    /** 並べている途中の状態。段ごとに、次に積む位置（上から mm）を持つ。 */
    private static final class Layout {
        private final float widthMm;
        private final float heightMm;
        private final float contentWidthMm;
        private final float columnWidthMm;
        private final float[] columnTops;
        private final float fontSizePt;
        final List<VenuePage> pages = new ArrayList<>();
        final List<VenueElement> elements = new ArrayList<>();
        private String pageId;

        Layout(float widthMm, float heightMm) {
            this.widthMm = widthMm;
            this.heightMm = heightMm;
            this.contentWidthMm = widthMm - MARGIN_MM * 2;
            int columns = contentWidthMm >= TWO_COLUMNS_MIN_WIDTH_MM ? 2 : 1;
            this.columnWidthMm = columns == 2 ? (contentWidthMm - COLUMN_GAP_MM) / 2 : contentWidthMm;
            this.columnTops = new float[columns];
            this.fontSizePt = contentWidthMm < 120f ? 8f : 9f;
            newPage();
        }

        void header() {
            float y = MARGIN_MM;
            elements.add(text(MARGIN_MM, y, contentWidthMm, 10f, "${live.name}", 16f, true, TEXT_COLOR));
            y += 11f;
            elements.add(text(MARGIN_MM, y, contentWidthMm, 6f,
                    // 空の値があっても区切りだけが残らないよう、空白で区切る
                    "${formatDate(live.date, 'yyyy/M/d')}　${live.location}　${live.tenantName}", 9f, false, SUB_COLOR));
            y += 6f;
            elements.add(text(MARGIN_MM, y, contentWidthMm, 5f,
                    "提出日時: ${formatDate(submission.submittedAt, 'yyyy/M/d HH:mm')}", 9f, false, SUB_COLOR));
            y += 7f;
            elements.add(new VenueElement.ShapeElement(id(), pageId, MARGIN_MM, y, contentWidthMm, 1f, null,
                    "line", BORDER, 0.6f, null));
            Arrays.fill(columnTops, y + GAP_MM);
        }

        void place(Unit unit) {
            boolean fullWidth = columnTops.length > 1 && unit.body() instanceof FormTemplateContent.Group group
                    && !FormTemplateColumns.fits(group.group(), columnWidthMm);
            float width = fullWidth ? contentWidthMm : columnWidthMm;
            float headingMm = unit.heading() == null ? 0f : HEADING_MM;
            float[] size = bodySize(unit, width);
            int column = fullWidth ? -1 : lowestColumn();
            float top = fullWidth ? highestTop() : columnTops[column];
            if (heightMm - MARGIN_MM - top < headingMm + size[1]) {
                newPage();
                top = MARGIN_MM;
                column = fullWidth ? -1 : 0;
            }
            float x = MARGIN_MM + (column <= 0 ? 0 : column * (columnWidthMm + COLUMN_GAP_MM));
            if (unit.heading() != null) {
                elements.add(text(x, top, width, headingMm - 1f, unit.heading(), 10.5f, true, TEXT_COLOR));
            }
            float bodyTop = top + headingMm;
            float bodyHeight = Math.min(size[0], heightMm - MARGIN_MM - bodyTop);
            elements.add(body(unit, x, bodyTop, width, bodyHeight));
            float next = bodyTop + bodyHeight + GAP_MM + 2f;
            if (fullWidth) {
                Arrays.fill(columnTops, next);
            } else {
                columnTops[column] = next;
            }
        }

        /** [ほしい高さ, 最低限の高さ]。最低限が入らなければ次のページから始める。 */
        private float[] bodySize(Unit unit, float width) {
            return switch (unit.body()) {
                case FormTemplateContent.Fields fields -> {
                    float rows = 0;
                    for (FormBlockResponse field : fields.fields()) {
                        rows += "LONG_TEXT".equals(field.type()) ? 2 : 1;
                    }
                    yield new float[] { rows * ROW_MM, Math.min(rows, 3) * ROW_MM };
                }
                case FormTemplateContent.Group group -> {
                    Integer minItems = group.group().minItems();
                    int rows = Math.min(MAX_GROUP_ROWS, Math.max(GROUP_ROWS, minItems == null ? 0 : minItems));
                    yield new float[] { HEADER_ROW_MM + rows * ROW_MM, HEADER_ROW_MM + 2 * ROW_MM };
                }
                case FormTemplateContent.StagePlot stage -> {
                    float wanted = Math.max(MIN_STAGE_MM, width * STAGE_RATIO);
                    yield new float[] { wanted, Math.min(wanted, MIN_STAGE_MM) };
                }
            };
        }

        private VenueElement body(Unit unit, float x, float y, float w, float h) {
            return switch (unit.body()) {
                case FormTemplateContent.Fields fields -> {
                    List<TableSource.FieldRef> refs = fields.fields().stream()
                            .map(field -> new TableSource.FieldRef(field.id(), field.label()))
                            .toList();
                    float labelRatio = Math.max(0.2f, Math.min(0.4f, 34f / w));
                    List<TableColumn> columns = List.of(
                            new TableColumn(id(), "項目", "__label__", labelRatio, "left", null, null, null),
                            new TableColumn(id(), "内容", null, 1f - labelRatio, "left",
                                    FormTemplateColumns.valueFormat(fields.fields()), null, null));
                    yield grid(x, y, w, h, new TableSource.FieldsSource(refs), columns, false);
                }
                case FormTemplateContent.Group group -> grid(x, y, w, h,
                        new TableSource.GroupSource(group.group().id(), group.group().label()),
                        FormTemplateColumns.of(group.group(), w), true);
                case FormTemplateContent.StagePlot stage -> new VenueElement.StagePlotElement(id(), pageId, x, y, w, h,
                        null, stage.field().id(), null, null, "withBase", 7f);
            };
        }

        private VenueElement grid(float x, float y, float w, float h, TableSource source, List<TableColumn> columns,
                boolean showHeader) {
            return new VenueElement.GridElement(id(), pageId, x, y, w, h, null, source, columns, showHeader,
                    fontSizePt, HEADER_FILL, BORDER, false, true);
        }

        private VenueElement text(float x, float y, float w, float h, String content, float sizePt, boolean bold,
                String color) {
            return new VenueElement.TextElement(id(), pageId, x, y, w, h, null, content, sizePt, bold, "left",
                    "middle", color, true, null, null, null);
        }

        private int lowestColumn() {
            int lowest = 0;
            for (int i = 1; i < columnTops.length; i++) {
                if (columnTops[i] < columnTops[lowest]) lowest = i;
            }
            return lowest;
        }

        private float highestTop() {
            float top = 0;
            for (float columnTop : columnTops) top = Math.max(top, columnTop);
            return top;
        }

        private void newPage() {
            pageId = "page-" + (pages.size() + 1);
            pages.add(new VenuePage(pageId, widthMm, heightMm, null, MARGIN_MM));
            Arrays.fill(columnTops, MARGIN_MM);
        }
    }

    private static String id() {
        return UUID.randomUUID().toString();
    }
}

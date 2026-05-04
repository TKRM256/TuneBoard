package jp.tubeboard.features.lives.pdf.canvas;

import java.awt.Color;
import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.pdf.PdfLayoutEngine;
import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;
import jp.tubeboard.features.lives.pdf.canvas.CanvasContext.GroupRef;
import jp.tubeboard.features.lives.pdf.canvas.CanvasContext.ItemRef;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasPage;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;

/**
 * Renders a {@link CanvasDocument} onto a single PDF page using absolute mm
 * coordinates. The schema's coordinate origin is the top-left of the page; this
 * class converts to PDFBox's bottom-left origin.
 */
public class CanvasRenderer {

    private static final float DEFAULT_FONT_SIZE = 10f;
    private static final float DEFAULT_TABLE_FONT_SIZE = 9f;
    private static final float CELL_PAD_X = 2f;
    private static final float CELL_PAD_Y = 2f;
    private static final Color HEADER_FILL = new Color(0xe5, 0xed, 0xf6);
    private static final Color BORDER_COLOR = new Color(0xd1, 0xd5, 0xdb);

    private final ExpressionEvaluator evaluator;
    private final Map<String, Object> namespace;

    public CanvasRenderer(ExpressionEvaluator evaluator, LiveResponse live,
            SettingSheetConfigResponse config, PublicSettingSheetSubmissionDetailResponse submission) {
        this.evaluator = evaluator;
        this.namespace = CanvasContext.build(live, config, submission);
    }

    public void render(CanvasDocument document, PDDocument pdf, PDType0Font font) throws IOException {
        CanvasPage page = document.page();
        PdfPaperSize size = page != null && page.size() != null ? page.size() : PdfPaperSize.A4;
        PdfOrientation orientation = page != null && page.orientation() != null
                ? page.orientation() : PdfOrientation.LANDSCAPE;
        PDRectangle pageBox = size.rectangle(orientation);

        PDPage pdPage = new PDPage(pageBox);
        pdf.addPage(pdPage);
        try (PDPageContentStream stream = new PDPageContentStream(pdf, pdPage)) {
            float pageHeightPt = pageBox.getHeight();
            List<CanvasElement> elements = document.elements();
            if (elements == null) return;
            for (CanvasElement element : elements) {
                renderElement(element, stream, font, pageHeightPt);
            }
        }
    }

    private void renderElement(CanvasElement element, PDPageContentStream stream, PDType0Font font,
            float pageHeightPt) throws IOException {
        if (element instanceof CanvasElement.TextElement t) {
            renderText(t, stream, font, pageHeightPt);
        } else if (element instanceof CanvasElement.FieldElement f) {
            renderField(f, stream, font, pageHeightPt);
        } else if (element instanceof CanvasElement.DividerElement d) {
            renderDivider(d, stream, pageHeightPt);
        } else if (element instanceof CanvasElement.SpacerElement) {
            // Spacer is editor-only; nothing to draw.
        } else if (element instanceof CanvasElement.TableElement table) {
            renderTable(table, stream, font, pageHeightPt);
        }
    }

    // ─────────── Text / Field ───────────

    private void renderText(CanvasElement.TextElement t, PDPageContentStream stream, PDType0Font font,
            float pageHeightPt) throws IOException {
        Box box = boxOf(t.xMm(), t.yMm(), t.wMm(), t.hMm(), pageHeightPt);
        drawBackgroundAndBorder(stream, box, t.backgroundColor(), t.borderColor(), t.borderThicknessPt());
        String content = evaluator.interpolate(nullToEmpty(t.content()), namespace);
        float fs = nonNullOr(t.fontSizePt(), DEFAULT_FONT_SIZE);
        Color color = parseColor(t.color(), Color.BLACK);
        drawTextBox(stream, font, content, box, fs, t.align(), t.verticalAlign(), color, Boolean.TRUE.equals(t.bold()));
    }

    private void renderField(CanvasElement.FieldElement f, PDPageContentStream stream, PDType0Font font,
            float pageHeightPt) throws IOException {
        Box box = boxOf(f.xMm(), f.yMm(), f.wMm(), f.hMm(), pageHeightPt);
        drawBackgroundAndBorder(stream, box, f.backgroundColor(), f.borderColor(), f.borderThicknessPt());
        float fs = nonNullOr(f.fontSizePt(), DEFAULT_FONT_SIZE);
        Color color = parseColor(f.color(), Color.BLACK);

        String value = lookupFieldValue(f.fieldId());
        String text;
        if (Boolean.TRUE.equals(f.showLabel())) {
            String label = !isBlank(f.labelOverride()) ? f.labelOverride()
                    : (!isBlank(f.fallbackLabel()) ? f.fallbackLabel() : f.fieldId());
            text = label + ": " + value;
        } else {
            text = value;
        }
        drawTextBox(stream, font, text, box, fs, f.align(), f.verticalAlign(), color, Boolean.TRUE.equals(f.bold()));
    }

    private String lookupFieldValue(String fieldId) {
        if (isBlank(fieldId)) return "";
        Object fields = namespace.get("fields");
        if (fields instanceof Map<?, ?> map) {
            Object ref = map.get(fieldId);
            if (ref instanceof CanvasContext.FieldRef fr) return fr.getValue();
        }
        return "";
    }

    // ─────────── Divider ───────────

    private void renderDivider(CanvasElement.DividerElement d, PDPageContentStream stream, float pageHeightPt)
            throws IOException {
        Box box = boxOf(d.xMm(), d.yMm(), d.wMm(), d.hMm(), pageHeightPt);
        Color color = parseColor(d.color(), BORDER_COLOR);
        float thickness = nonNullOr(d.thicknessPt(), 0.6f);
        float midY = box.bottomY + box.heightPt / 2f;
        stream.setStrokingColor(color);
        stream.setLineWidth(thickness);
        stream.moveTo(box.leftX, midY);
        stream.lineTo(box.leftX + box.widthPt, midY);
        stream.stroke();
    }

    // ─────────── Table ───────────

    private void renderTable(CanvasElement.TableElement table, PDPageContentStream stream, PDType0Font font,
            float pageHeightPt) throws IOException {
        Box box = boxOf(table.xMm(), table.yMm(), table.wMm(), table.hMm(), pageHeightPt);
        Color borderColor = parseColor(table.borderColor(), BORDER_COLOR);
        Color headerFill = parseColor(table.headerFill(), HEADER_FILL);
        float fs = nonNullOr(table.fontSizePt(), DEFAULT_TABLE_FONT_SIZE);

        List<TableColumn> columns = table.columns() != null ? table.columns() : List.of();
        if (columns.isEmpty()) return;

        float[] widths = computeColumnWidths(columns, box.widthPt);
        boolean showHeader = !Boolean.FALSE.equals(table.showHeader());
        float headerHeight = showHeader ? lineHeight(fs) + CELL_PAD_Y * 2 : 0f;

        // Header background
        if (showHeader && headerHeight > 0f) {
            float headerTop = box.topY;
            float headerBottom = headerTop - headerHeight;
            fillRect(stream, box.leftX, headerBottom, box.widthPt, headerHeight, headerFill);
            float baselineY = headerTop - CELL_PAD_Y - fs;
            float x = box.leftX;
            for (int i = 0; i < columns.size(); i++) {
                TableColumn c = columns.get(i);
                drawCellText(stream, font, nullToEmpty(c.header()), x, baselineY, widths[i], fs, c.align(), Color.BLACK);
                x += widths[i];
            }
        }

        // Rows
        List<RowData> rows = collectRows(table);
        float rowFs = fs;
        float rowLh = lineHeight(rowFs);
        float currentY = box.topY - headerHeight;
        boolean zebra = Boolean.TRUE.equals(table.zebra());
        for (int r = 0; r < rows.size(); r++) {
            RowData row = rows.get(r);
            float rowHeight = computeRowHeight(font, columns, widths, row, rowFs);
            if (currentY - rowHeight < box.bottomY) break; // clip overflow rows
            if (zebra && r % 2 == 1) {
                fillRect(stream, box.leftX, currentY - rowHeight, box.widthPt, rowHeight,
                        new Color(0xf9, 0xfa, 0xfb));
            }
            float baselineY = currentY - CELL_PAD_Y - rowFs;
            float x = box.leftX;
            for (int i = 0; i < columns.size(); i++) {
                TableColumn c = columns.get(i);
                String text = row.cellText(c, evaluator, namespace);
                drawCellText(stream, font, text, x, baselineY, widths[i], rowFs, c.align(), Color.BLACK);
                x += widths[i];
            }
            currentY -= rowHeight;
        }

        // Outer + column dividers
        strokeRect(stream, box.leftX, box.bottomY, box.widthPt, box.heightPt, borderColor, 0.5f);
        if (showHeader) {
            stream.setStrokingColor(borderColor);
            stream.setLineWidth(0.5f);
            stream.moveTo(box.leftX, box.topY - headerHeight);
            stream.lineTo(box.leftX + box.widthPt, box.topY - headerHeight);
            stream.stroke();
        }
        float colX = box.leftX;
        for (int i = 0; i < widths.length - 1; i++) {
            colX += widths[i];
            stream.setStrokingColor(borderColor);
            stream.setLineWidth(0.3f);
            stream.moveTo(colX, box.bottomY);
            stream.lineTo(colX, box.topY);
            stream.stroke();
        }
    }

    private List<RowData> collectRows(CanvasElement.TableElement table) {
        TableSource src = table.source();
        if (src instanceof TableSource.GroupSource g) {
            Object groups = namespace.get("groups");
            if (groups instanceof Map<?, ?> map) {
                Object ref = map.get(g.groupId());
                if (ref instanceof GroupRef gr) {
                    return gr.getItems().stream()
                            .map((ItemRef item) -> (RowData) new GroupRow(item))
                            .toList();
                }
            }
            return List.of();
        }
        if (src instanceof TableSource.FieldsSource fs) {
            return fs.fields() == null ? List.of()
                    : fs.fields().stream()
                            .map(f -> (RowData) new FieldRow(f.fieldId(), f.fallbackLabel(), namespace))
                            .toList();
        }
        return List.of();
    }

    private float computeRowHeight(PDType0Font font, List<TableColumn> columns, float[] widths,
            RowData row, float fs) throws IOException {
        float maxLines = 1;
        for (int i = 0; i < columns.size(); i++) {
            TableColumn c = columns.get(i);
            String text = row.cellText(c, evaluator, namespace);
            int lineCount = Math.max(1, wrapLines(font, text, widths[i] - CELL_PAD_X * 2, fs).size());
            if (lineCount > maxLines) maxLines = lineCount;
        }
        return maxLines * lineHeight(fs) + CELL_PAD_Y * 2;
    }

    private float[] computeColumnWidths(List<TableColumn> columns, float totalWidth) {
        float[] widths = new float[columns.size()];
        float assigned = 0f;
        int unset = 0;
        for (int i = 0; i < columns.size(); i++) {
            Float ratio = columns.get(i).widthRatio();
            if (ratio != null && ratio > 0f) {
                widths[i] = totalWidth * ratio;
                assigned += widths[i];
            } else {
                unset++;
            }
        }
        if (unset > 0) {
            float remaining = Math.max(0, totalWidth - assigned);
            float each = remaining / unset;
            for (int i = 0; i < widths.length; i++) {
                if (widths[i] == 0f) widths[i] = each;
            }
        } else if (assigned > 0 && Math.abs(assigned - totalWidth) > 0.01f) {
            float scale = totalWidth / assigned;
            for (int i = 0; i < widths.length; i++) widths[i] *= scale;
        }
        return widths;
    }

    private interface RowData {
        String cellText(TableColumn column, ExpressionEvaluator evaluator, Map<String, Object> namespace);
    }

    private record GroupRow(ItemRef item) implements RowData {
        @Override
        public String cellText(TableColumn column, ExpressionEvaluator evaluator, Map<String, Object> namespace) {
            if ("__index__".equals(column.fieldId())) {
                return String.valueOf(item.getIndex() + 1);
            }
            String fieldId = column.fieldId();
            CanvasContext.FieldRef ref = item.field(fieldId);
            if (!isBlankStr(column.format())) {
                Map<String, Object> ns = new java.util.HashMap<>(namespace);
                ns.put("value", ref.getValue());
                ns.put("values", ref.getValues());
                ns.put("item", item);
                return evaluator.interpolate(column.format(), ns);
            }
            return ref.getValue();
        }
    }

    private record FieldRow(String fieldId, String fallbackLabel, Map<String, Object> ns) implements RowData {
        @Override
        public String cellText(TableColumn column, ExpressionEvaluator evaluator, Map<String, Object> namespace) {
            if ("__label__".equals(column.fieldId())) {
                return fallbackLabel != null ? fallbackLabel : fieldId;
            }
            // Default = the value of the row's referenced field
            Object fields = namespace.get("fields");
            if (fields instanceof Map<?, ?> map) {
                Object ref = map.get(fieldId);
                if (ref instanceof CanvasContext.FieldRef fr) {
                    if (!isBlankStr(column.format())) {
                        Map<String, Object> local = new java.util.HashMap<>(namespace);
                        local.put("value", fr.getValue());
                        local.put("values", fr.getValues());
                        return evaluator.interpolate(column.format(), local);
                    }
                    return fr.getValue();
                }
            }
            return "";
        }
    }

    // ─────────── Drawing primitives ───────────

    private void drawTextBox(PDPageContentStream stream, PDType0Font font, String text, Box box,
            float fs, String align, String verticalAlign, Color color, boolean bold) throws IOException {
        if (text == null || text.isEmpty()) return;
        List<String> lines = wrapLines(font, text, box.widthPt - 2f, fs);
        float lh = lineHeight(fs);
        float totalHeight = lines.size() * lh;
        float topOffset;
        if ("middle".equalsIgnoreCase(verticalAlign) || "center".equalsIgnoreCase(verticalAlign)) {
            topOffset = (box.heightPt - totalHeight) / 2f;
        } else if ("bottom".equalsIgnoreCase(verticalAlign)) {
            topOffset = box.heightPt - totalHeight;
        } else {
            topOffset = 0f;
        }
        float y = box.topY - topOffset - fs;
        for (String line : lines) {
            float lineWidth = measureWidth(font, line, fs);
            float x;
            if ("center".equalsIgnoreCase(align)) {
                x = box.leftX + (box.widthPt - lineWidth) / 2f;
            } else if ("right".equalsIgnoreCase(align)) {
                x = box.leftX + box.widthPt - lineWidth - 1f;
            } else {
                x = box.leftX + 1f;
            }
            stream.beginText();
            stream.setFont(font, fs);
            stream.setNonStrokingColor(color);
            stream.newLineAtOffset(x, y);
            stream.showText(line);
            stream.endText();
            y -= lh;
            if (bold) {
                // Rough bold emulation: redraw with a small offset.
                stream.beginText();
                stream.setFont(font, fs);
                stream.setNonStrokingColor(color);
                stream.newLineAtOffset(x + 0.3f, y + lh);
                stream.showText(line);
                stream.endText();
            }
        }
    }

    private void drawCellText(PDPageContentStream stream, PDType0Font font, String text, float cellX,
            float baselineY, float cellWidth, float fs, String align, Color color) throws IOException {
        if (text == null || text.isEmpty()) return;
        List<String> lines = wrapLines(font, text, cellWidth - CELL_PAD_X * 2, fs);
        float lh = lineHeight(fs);
        float y = baselineY;
        for (String line : lines) {
            float lineWidth = measureWidth(font, line, fs);
            float x;
            if ("center".equalsIgnoreCase(align)) {
                x = cellX + (cellWidth - lineWidth) / 2f;
            } else if ("right".equalsIgnoreCase(align)) {
                x = cellX + cellWidth - lineWidth - CELL_PAD_X;
            } else {
                x = cellX + CELL_PAD_X;
            }
            stream.beginText();
            stream.setFont(font, fs);
            stream.setNonStrokingColor(color);
            stream.newLineAtOffset(x, y);
            stream.showText(line);
            stream.endText();
            y -= lh;
        }
    }

    private void drawBackgroundAndBorder(PDPageContentStream stream, Box box, String bgHex, String borderHex,
            Float borderThickness) throws IOException {
        if (!isBlank(bgHex)) {
            Color bg = parseColor(bgHex, null);
            if (bg != null) fillRect(stream, box.leftX, box.bottomY, box.widthPt, box.heightPt, bg);
        }
        if (!isBlank(borderHex) && (borderThickness == null || borderThickness > 0)) {
            Color bc = parseColor(borderHex, null);
            if (bc != null) strokeRect(stream, box.leftX, box.bottomY, box.widthPt, box.heightPt, bc,
                    nonNullOr(borderThickness, 0.5f));
        }
    }

    private void fillRect(PDPageContentStream stream, float x, float y, float w, float h, Color color) throws IOException {
        stream.setNonStrokingColor(color);
        stream.addRect(x, y, w, h);
        stream.fill();
    }

    private void strokeRect(PDPageContentStream stream, float x, float y, float w, float h, Color color, float lineWidth)
            throws IOException {
        stream.setStrokingColor(color);
        stream.setLineWidth(lineWidth);
        stream.addRect(x, y, w, h);
        stream.stroke();
    }

    // ─────────── Text wrapping ───────────

    private List<String> wrapLines(PDType0Font font, String text, float maxWidth, float fs) throws IOException {
        java.util.List<String> result = new java.util.ArrayList<>();
        if (text == null || text.isEmpty()) return result;
        for (String paragraph : text.split("\\R", -1)) {
            wrapParagraph(font, paragraph, maxWidth, fs, result);
        }
        return result;
    }

    private void wrapParagraph(PDType0Font font, String paragraph, float maxWidth, float fs, List<String> out)
            throws IOException {
        if (paragraph.isEmpty()) {
            out.add("");
            return;
        }
        StringBuilder current = new StringBuilder();
        for (int i = 0; i < paragraph.length(); i++) {
            char ch = paragraph.charAt(i);
            current.append(ch);
            float width = measureWidth(font, current.toString(), fs);
            if (width > maxWidth) {
                if (current.length() == 1) {
                    out.add(current.toString());
                    current.setLength(0);
                } else {
                    current.deleteCharAt(current.length() - 1);
                    out.add(current.toString());
                    current.setLength(0);
                    current.append(ch);
                }
            }
        }
        if (current.length() > 0) {
            out.add(current.toString());
        }
    }

    private float measureWidth(PDType0Font font, String text, float fs) throws IOException {
        if (text == null || text.isEmpty()) return 0f;
        return font.getStringWidth(text) / 1000f * fs;
    }

    private float lineHeight(float fs) {
        return fs * 1.35f;
    }

    // ─────────── Geometry ───────────

    private record Box(float leftX, float bottomY, float topY, float widthPt, float heightPt) {
    }

    private Box boxOf(Float xMm, Float yMm, Float wMm, Float hMm, float pageHeightPt) {
        float x = nonNullOr(xMm, 0f) * PdfLayoutEngine.MM_TO_PT;
        float yTop = pageHeightPt - nonNullOr(yMm, 0f) * PdfLayoutEngine.MM_TO_PT;
        float w = nonNullOr(wMm, 50f) * PdfLayoutEngine.MM_TO_PT;
        float h = nonNullOr(hMm, 10f) * PdfLayoutEngine.MM_TO_PT;
        return new Box(x, yTop - h, yTop, w, h);
    }

    // ─────────── Misc helpers ───────────

    private static float nonNullOr(Float v, float fallback) {
        return v != null ? v : fallback;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static boolean isBlankStr(String s) {
        return s == null || s.isBlank();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private Color parseColor(String hex, Color fallback) {
        if (hex == null || hex.isBlank()) return fallback;
        String s = hex.startsWith("#") ? hex.substring(1) : hex;
        try {
            if (s.length() == 6) {
                int r = Integer.parseInt(s.substring(0, 2), 16);
                int g = Integer.parseInt(s.substring(2, 4), 16);
                int b = Integer.parseInt(s.substring(4, 6), 16);
                return new Color(r, g, b);
            }
        } catch (NumberFormatException ex) {
            // fall through
        }
        return fallback;
    }
}

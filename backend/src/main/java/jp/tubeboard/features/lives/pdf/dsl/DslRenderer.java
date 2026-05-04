package jp.tubeboard.features.lives.pdf.dsl;

import java.awt.Color;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.pdf.PdfLayoutEngine;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslChildren;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslColumn;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslDocument;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslNode;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.TableColumn;

/** Walks the DSL tree and renders into a {@link PdfLayoutEngine}. */
public class DslRenderer {

    private static final float SPACING = 5f;
    private static final float SECTION_RULE_OFFSET = 3f;

    private final PdfLayoutEngine engine;
    private final DslEvaluator evaluator;
    private final Map<String, Object> namespace;

    public DslRenderer(PdfLayoutEngine engine, DslEvaluator evaluator, LiveResponse live,
            SettingSheetConfigResponse config, PublicSettingSheetSubmissionDetailResponse submission) {
        this.engine = engine;
        this.evaluator = evaluator;
        this.namespace = DslContext.build(live, config, submission);
    }

    public void render(DslDocument document) throws IOException {
        engine.newPage();
        renderNodes(document.rows(), engine.contentLeft(), engine.contentWidth());
    }

    private void renderNodes(List<DslNode> nodes, float left, float width) throws IOException {
        if (nodes == null) return;
        for (DslNode node : nodes) {
            renderNode(node, left, width);
            engine.setCursorY(engine.cursorY() - SPACING);
        }
    }

    private void renderNode(DslNode node, float left, float width) throws IOException {
        if (node instanceof DslNode.Title n) {
            renderTitle(n, left, width);
        } else if (node instanceof DslNode.Text n) {
            renderText(n, left, width);
        } else if (node instanceof DslNode.Field n) {
            renderField(n, left, width);
        } else if (node instanceof DslNode.Hr) {
            renderHr(left, width);
        } else if (node instanceof DslNode.Space n) {
            float h = n.height() != null ? n.height() : 4f;
            engine.setCursorY(engine.cursorY() - h);
        } else if (node instanceof DslNode.Row n) {
            renderRow(n, left, width);
        } else if (node instanceof DslNode.Section n) {
            renderSection(n, left, width);
        } else if (node instanceof DslNode.Table n) {
            renderTable(n, left, width);
        } else if (node instanceof DslNode.ForEach n) {
            renderForEach(n, left, width);
        } else if (node instanceof DslNode.If n) {
            renderIf(n, left, width);
        }
    }

    private void renderTitle(DslNode.Title node, float left, float width) throws IOException {
        float fs = node.size() != null ? node.size() : engine.titleFontSize();
        String text = evaluator.interpolate(node.text(), namespace);
        engine.ensureSpace(engine.lineHeight(fs));
        List<String> lines = engine.wrap(text, width, fs);
        float y = engine.drawLines(lines, left, engine.cursorY(), fs, PdfLayoutEngine.COLOR_TEXT);
        engine.setCursorY(y);
    }

    private void renderText(DslNode.Text node, float left, float width) throws IOException {
        float fs = node.size() != null ? node.size() : engine.baseFontSize();
        String text = evaluator.interpolate(node.text(), namespace);
        Color color = parseColor(node.color(), PdfLayoutEngine.COLOR_TEXT);

        if (node.label() != null && !node.label().isBlank()) {
            float labelFs = engine.labelFontSize();
            engine.ensureSpace(engine.lineHeight(labelFs) + engine.lineHeight(fs));
            float topY = engine.cursorY();
            engine.drawText(node.label(), left, topY - labelFs, labelFs, PdfLayoutEngine.COLOR_TEXT_MUTED);
            engine.setCursorY(topY - engine.lineHeight(labelFs));
        } else {
            engine.ensureSpace(engine.lineHeight(fs));
        }
        List<String> lines = engine.wrap(text, width, fs);
        float endY = engine.drawLines(lines, left, engine.cursorY(), fs, color);
        engine.setCursorY(endY);
    }

    private void renderField(DslNode.Field node, float left, float width) throws IOException {
        DslContext.FieldRef ref = lookupField(node.fieldId());
        String label = node.label() != null ? node.label() : node.fieldId();
        String text = node.format() != null
                ? evaluator.interpolate(node.format(), withVar("value", ref.getValue()))
                : ref.getValue();
        renderText(new DslNode.Text(text, label, null, null, null, null), left, width);
    }

    private void renderHr(float left, float width) throws IOException {
        engine.ensureSpace(2f);
        float y = engine.cursorY();
        engine.drawHorizontalLine(left, left + width, y, PdfLayoutEngine.COLOR_BORDER, 0.5f);
        engine.setCursorY(y - 2f);
    }

    private void renderRow(DslNode.Row node, float left, float width) throws IOException {
        if (node.columns() == null || node.columns().isEmpty()) return;
        float gap = node.gap() != null ? node.gap() : 8f;
        float startY = engine.cursorY();
        float[] columnY = new float[node.columns().size()];
        for (int i = 0; i < columnY.length; i++) columnY[i] = startY;

        float totalWidth = width - gap * (node.columns().size() - 1);
        float cumulativeX = left;
        for (int i = 0; i < node.columns().size(); i++) {
            DslColumn column = node.columns().get(i);
            float colWidth = column.width() != null
                    ? totalWidth * column.width()
                    : totalWidth / node.columns().size();
            engine.setCursorY(startY);
            renderChildren(column.render(), cumulativeX, colWidth);
            columnY[i] = engine.cursorY();
            cumulativeX += colWidth + gap;
        }
        float minY = startY;
        for (float y : columnY) if (y < minY) minY = y;
        engine.setCursorY(minY);
    }

    private void renderSection(DslNode.Section node, float left, float width) throws IOException {
        engine.ensureSpace(engine.lineHeight(engine.headingFontSize()) + 30f);
        float topY = engine.cursorY();
        String title = evaluator.interpolate(node.title(), namespace);
        engine.drawText(title, left, topY - engine.headingFontSize(), engine.headingFontSize(),
                PdfLayoutEngine.COLOR_TEXT);
        float ruleY = topY - engine.headingFontSize() - SECTION_RULE_OFFSET;
        engine.drawHorizontalLine(left, left + width, ruleY, PdfLayoutEngine.COLOR_BORDER, 0.6f);
        engine.setCursorY(ruleY - 4f);

        if (node.description() != null && !node.description().isBlank()) {
            String desc = evaluator.interpolate(node.description(), namespace);
            float fs = engine.labelFontSize();
            List<String> lines = engine.wrap(desc, width, fs);
            float endY = engine.drawLines(lines, left, engine.cursorY(), fs, PdfLayoutEngine.COLOR_TEXT_MUTED);
            engine.setCursorY(endY - 2f);
        }
        renderChildren(node.render(), left + 4f, width - 8f);
    }

    private void renderTable(DslNode.Table node, float left, float width) throws IOException {
        if (node.columns() == null || node.columns().isEmpty()) return;
        List<?> rows = node.rows() != null ? evaluator.evaluateItems(node.rows(), namespace) : List.of();
        String rowVar = node.rowVar() != null && !node.rowVar().isBlank() ? node.rowVar() : "row";

        float headerFs = engine.labelFontSize();
        float cellFs = engine.baseFontSize();
        float headerHeight = engine.lineHeight(headerFs) + 4f;
        float cellPadding = 2f;
        boolean striped = Boolean.TRUE.equals(node.striped());

        engine.ensureSpace(headerHeight + 12f);
        float topY = engine.cursorY();

        engine.drawFilledRect(left, topY - headerHeight, width, headerHeight, PdfLayoutEngine.COLOR_BG_HEADER);
        float headerY = topY - headerFs - 2f;
        renderTableRowCells(node.columns(), left, width, headerY, headerFs, true, null);
        engine.drawHorizontalLine(left, left + width, topY - headerHeight, PdfLayoutEngine.COLOR_BORDER, 0.4f);
        engine.setCursorY(topY - headerHeight);

        boolean odd = false;
        for (Object item : rows) {
            Map<String, Object> rowNamespace = withVar(rowVar, item);

            // Pre-compute row height by measuring tallest cell.
            float rowHeight = computeRowHeight(node.columns(), width, cellFs, rowNamespace);
            engine.ensureSpace(rowHeight + cellPadding * 2);

            float rowTop = engine.cursorY();
            if (striped && odd) {
                engine.drawFilledRect(left, rowTop - (rowHeight + cellPadding * 2), width,
                        rowHeight + cellPadding * 2, PdfLayoutEngine.COLOR_BG_SUBTLE);
            }
            renderTableRowCells(node.columns(), left, width, rowTop - cellFs - cellPadding, cellFs, false,
                    rowNamespace);
            engine.drawHorizontalLine(left, left + width, rowTop - (rowHeight + cellPadding * 2),
                    PdfLayoutEngine.COLOR_BORDER, 0.2f);
            engine.setCursorY(rowTop - (rowHeight + cellPadding * 2));
            odd = !odd;
        }
        engine.drawStrokedRect(left, engine.cursorY(), width, topY - engine.cursorY(),
                PdfLayoutEngine.COLOR_BORDER, 0.4f);
    }

    private float computeRowHeight(List<TableColumn> columns, float width, float fs,
            Map<String, Object> rowNamespace) throws IOException {
        float[] widths = computeColumnWidths(columns, width);
        float max = engine.lineHeight(fs);
        for (int i = 0; i < columns.size(); i++) {
            TableColumn col = columns.get(i);
            String text = evaluator.interpolate(col.value(), rowNamespace);
            List<String> lines = engine.wrap(text, widths[i] - 4f, fs);
            float h = Math.max(1, lines.size()) * engine.lineHeight(fs);
            if (h > max) max = h;
        }
        return max;
    }

    private void renderTableRowCells(List<TableColumn> columns, float left, float width, float baselineY,
            float fs, boolean isHeader, Map<String, Object> rowNamespace) throws IOException {
        float[] widths = computeColumnWidths(columns, width);
        float x = left;
        for (int i = 0; i < columns.size(); i++) {
            TableColumn col = columns.get(i);
            String text = isHeader
                    ? (col.header() != null ? col.header() : "")
                    : evaluator.interpolate(col.value(), rowNamespace);
            String align = col.align() != null ? col.align() : "left";
            drawCellLines(text, x, baselineY, widths[i], fs, align, PdfLayoutEngine.COLOR_TEXT);
            x += widths[i];
        }
    }

    private void drawCellLines(String text, float x, float topBaseline, float colWidth, float fs, String align,
            java.awt.Color color) throws IOException {
        if (text == null || text.isEmpty()) return;
        List<String> lines = engine.wrap(text, colWidth - 8f, fs);
        float lineY = topBaseline;
        for (String line : lines) {
            float drawX;
            if ("center".equalsIgnoreCase(align)) {
                float tw = engine.measureTextWidth(line, fs);
                drawX = x + (colWidth - tw) / 2f;
            } else if ("right".equalsIgnoreCase(align)) {
                float tw = engine.measureTextWidth(line, fs);
                drawX = x + colWidth - tw - 4f;
            } else {
                drawX = x + 4f;
            }
            engine.drawText(line, drawX, lineY, fs, color);
            lineY -= engine.lineHeight(fs);
        }
    }

    private float[] computeColumnWidths(List<TableColumn> columns, float totalWidth) {
        float[] widths = new float[columns.size()];
        float assigned = 0;
        int unset = 0;
        for (int i = 0; i < columns.size(); i++) {
            Float w = columns.get(i).width();
            if (w != null) {
                widths[i] = totalWidth * w;
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
        }
        return widths;
    }

    private void renderForEach(DslNode.ForEach node, float left, float width) throws IOException {
        List<?> items = evaluator.evaluateItems(node.items(), namespace);
        String var = node.as() != null && !node.as().isBlank() ? node.as() : "item";
        for (Object item : items) {
            Object previous = namespace.get(var);
            namespace.put(var, item);
            try {
                renderChildren(node.render(), left, width);
            } finally {
                if (previous == null) namespace.remove(var);
                else namespace.put(var, previous);
            }
        }
    }

    private void renderIf(DslNode.If node, float left, float width) throws IOException {
        boolean cond = evaluator.evaluateBoolean(node.cond(), namespace);
        DslChildren branch = cond ? node.thenBranch() : node.elseBranch();
        if (branch != null) {
            renderChildren(branch, left, width);
        }
    }

    private void renderChildren(DslChildren children, float left, float width) throws IOException {
        if (children == null) return;
        renderNodes(children.nodes(), left, width);
    }

    @SuppressWarnings("unchecked")
    private DslContext.FieldRef lookupField(String id) {
        Object fields = namespace.get("fields");
        if (fields instanceof Map<?, ?> map) {
            Object ref = ((Map<String, Object>) map).get(id);
            if (ref instanceof DslContext.FieldRef fr) return fr;
        }
        return new DslContext.FieldRef("", List.of(), true);
    }

    private Map<String, Object> withVar(String key, Object value) {
        Map<String, Object> copy = new HashMap<>(namespace);
        copy.put(key, value);
        return copy;
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
            // ignore
        }
        return fallback;
    }
}

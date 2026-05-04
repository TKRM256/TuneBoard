package jp.tubeboard.features.lives.pdf;

import java.awt.Color;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.ItunesLinkResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;

/**
 * Renders a submission as a tight, table-driven setting sheet:
 * - title (record label) at top
 * - left: 2-column info table (label/value pairs)
 * - right: first repeatable group as a table (or full-width if no info)
 * - subsequent groups stacked full-width as tables
 */
public class SubmissionPdfRenderer {

    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy/M/d HH:mm",
            Locale.JAPAN);
    private static final float COLUMN_GAP = 8f;
    private static final float CELL_PAD_X = 4f;
    private static final float CELL_PAD_Y = 3f;
    private static final float SECTION_GAP = 8f;
    private static final float HEADER_GAP = 6f;

    private final PdfLayoutEngine engine;
    private final PdfLayoutOptions options;
    private final float density;

    public SubmissionPdfRenderer(PdfLayoutEngine engine, PdfLayoutOptions options) {
        this.engine = engine;
        this.options = options.withDefaults();
        this.density = this.options.density().multiplier();
    }

    public void render(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission) throws IOException {
        engine.newPage();
        Map<String, FieldAnswerResponse> answers = indexAnswers(submission.answers());

        renderHeader(live, submission, answers);

        // Categorize top-level blocks
        List<InfoRow> infoRows = collectInfoRows(live, submission, config.blocks(), answers);
        List<FormBlockResponse> groups = collectVisibleGroups(config.blocks());

        boolean hasInfo = !infoRows.isEmpty();
        boolean hasGroups = !groups.isEmpty();

        if (hasInfo && hasGroups) {
            renderInfoAndFirstGroupSideBySide(infoRows, groups.get(0), answers);
            for (int i = 1; i < groups.size(); i++) {
                engine.setCursorY(engine.cursorY() - spacing(SECTION_GAP));
                renderGroupTable(groups.get(i), answers, engine.contentLeft(), engine.contentWidth());
            }
        } else if (hasInfo) {
            renderInfoTable(infoRows, engine.contentLeft(), engine.contentWidth() * 0.6f);
        } else if (hasGroups) {
            for (int i = 0; i < groups.size(); i++) {
                if (i > 0) engine.setCursorY(engine.cursorY() - spacing(SECTION_GAP));
                renderGroupTable(groups.get(i), answers, engine.contentLeft(), engine.contentWidth());
            }
        }

        if (Boolean.TRUE.equals(options.includeItunesLinks()) && submission.itunesLinks() != null
                && !submission.itunesLinks().isEmpty()) {
            engine.setCursorY(engine.cursorY() - spacing(SECTION_GAP));
            renderItunesLinks(submission.itunesLinks());
        }
    }

    // ────────── Header ──────────

    private void renderHeader(LiveResponse live, PublicSettingSheetSubmissionDetailResponse submission,
            Map<String, FieldAnswerResponse> answers) throws IOException {
        PdfHeaderOptions h = options.header();
        float left = engine.contentLeft();
        float right = engine.contentRight();
        float topY = engine.cursorY();
        float titleFs = engine.titleFontSize();
        float metaFs = 9f;

        String rightInfo = buildHeaderRightInfo(live, h);
        float rightInfoWidth = rightInfo.isEmpty() ? 0f : engine.measureTextWidth(rightInfo, metaFs) + 8f;
        float titleAvailable = right - left - rightInfoWidth;

        String title = resolveTitle(live, submission, answers);

        float endY = topY;
        if (hasText(title)) {
            List<String> lines = engine.wrap(title, Math.max(80f, titleAvailable), titleFs);
            float y = topY - titleFs;
            for (String line : lines) {
                engine.drawText(line, left, y, titleFs, PdfLayoutEngine.COLOR_TEXT);
                y -= engine.lineHeight(titleFs);
            }
            endY = y + engine.lineHeight(titleFs) - titleFs;
        }
        if (!rightInfo.isEmpty()) {
            engine.drawText(rightInfo, right - (rightInfoWidth - 8f), topY - metaFs - 2f, metaFs,
                    PdfLayoutEngine.COLOR_TEXT_MUTED);
        }
        engine.setCursorY(endY - spacing(HEADER_GAP));
    }

    private String resolveTitle(LiveResponse live, PublicSettingSheetSubmissionDetailResponse submission,
            Map<String, FieldAnswerResponse> answers) {
        PdfHeaderOptions h = options.header();
        String titleSourceFieldId = options.titleSourceFieldId();
        if (hasText(titleSourceFieldId)) {
            FieldAnswerResponse ans = answers.get(titleSourceFieldId);
            if (ans != null && ans.values() != null && !ans.values().isEmpty()) {
                String first = ans.values().get(0);
                if (hasText(first)) return first;
            }
        }
        if (Boolean.TRUE.equals(h.showRecordLabel()) && hasText(submission.recordLabel())) {
            return submission.recordLabel();
        }
        if (Boolean.TRUE.equals(h.showLiveName())) {
            return live.name() != null ? live.name() : "";
        }
        return "";
    }

    private String buildHeaderRightInfo(LiveResponse live, PdfHeaderOptions h) {
        List<String> parts = new ArrayList<>();
        if (Boolean.TRUE.equals(h.showLiveName()) && hasText(live.name())) parts.add(live.name());
        if (Boolean.TRUE.equals(h.showLiveDate()) && live.date() != null) {
            parts.add(DateTimeFormatter.ofPattern("yyyy/M/d", Locale.JAPAN).format(live.date()));
        }
        if (Boolean.TRUE.equals(h.showLiveLocation()) && hasText(live.location())) parts.add(live.location());
        if (Boolean.TRUE.equals(h.showTenantName()) && hasText(live.tenantName())) parts.add(live.tenantName());
        return String.join("  /  ", parts);
    }

    // ────────── Info table ──────────

    private record InfoRow(String label, String value) {
    }

    private List<InfoRow> collectInfoRows(LiveResponse live, PublicSettingSheetSubmissionDetailResponse submission,
            List<FormBlockResponse> blocks, Map<String, FieldAnswerResponse> answers) {
        List<InfoRow> rows = new ArrayList<>();
        PdfHeaderOptions h = options.header();
        if (Boolean.TRUE.equals(h.showSubmittedAt()) && submission.submittedAt() != null) {
            rows.add(new InfoRow("最終更新日", DATETIME_FORMAT.format(submission.submittedAt())));
        }
        if (Boolean.TRUE.equals(h.showSubmissionStatus()) && hasText(submission.submissionStatus())) {
            rows.add(new InfoRow("状態", submission.submissionStatus()));
        }
        if (live != null) {
            // Optional: live meta into info table if enabled
        }
        collectInfoRowsFromBlocks(blocks, answers, rows);
        return rows;
    }

    private void collectInfoRowsFromBlocks(List<FormBlockResponse> blocks, Map<String, FieldAnswerResponse> answers,
            List<InfoRow> rows) {
        if (blocks == null) return;
        String titleSourceFieldId = options.titleSourceFieldId();
        for (FormBlockResponse block : blocks) {
            if (options.isHidden(block.id())) continue;
            if ("REPEATABLE_GROUP".equals(block.type())) continue;
            if ("SECTION".equals(block.type())) {
                collectInfoRowsFromBlocks(block.fields(), answers, rows);
                continue;
            }
            // Skip if this field is the title source (already shown as header)
            if (hasText(titleSourceFieldId) && titleSourceFieldId.equals(block.id())) continue;
            String label = options.labelFor(block.id(), block.label());
            String value = formatValueWithBreaks(block, answers.get(block.id()));
            if (!hasText(value) || "—".equals(value)) continue;
            rows.add(new InfoRow(label, value));
        }
    }

    private List<FormBlockResponse> collectVisibleGroups(List<FormBlockResponse> blocks) {
        List<FormBlockResponse> result = new ArrayList<>();
        if (blocks == null) return result;
        for (FormBlockResponse block : blocks) {
            if (options.isHidden(block.id())) continue;
            if ("REPEATABLE_GROUP".equals(block.type())) {
                result.add(block);
            } else if ("SECTION".equals(block.type())) {
                result.addAll(collectVisibleGroups(block.fields()));
            }
        }
        return result;
    }

    private void renderInfoAndFirstGroupSideBySide(List<InfoRow> infoRows, FormBlockResponse firstGroup,
            Map<String, FieldAnswerResponse> answers) throws IOException {
        float totalWidth = engine.contentWidth();
        float infoWidth = totalWidth * 0.38f;
        float groupWidth = totalWidth - infoWidth - COLUMN_GAP;
        float startY = engine.cursorY();

        engine.setCursorY(startY);
        renderInfoTable(infoRows, engine.contentLeft(), infoWidth);
        float infoEndY = engine.cursorY();

        engine.setCursorY(startY);
        renderGroupTable(firstGroup, answers, engine.contentLeft() + infoWidth + COLUMN_GAP, groupWidth);
        float groupEndY = engine.cursorY();

        engine.setCursorY(Math.min(infoEndY, groupEndY));
    }

    private void renderInfoTable(List<InfoRow> rows, float left, float width) throws IOException {
        if (rows.isEmpty()) return;
        float labelWidth = Math.min(width * 0.35f, 90f);
        float valueWidth = width - labelWidth;
        float fs = engine.baseFontSize();
        float lineHeight = engine.lineHeight(fs);

        for (InfoRow row : rows) {
            // Pre-measure value height for cell sizing
            List<String> labelLines = engine.wrap(row.label(), labelWidth - CELL_PAD_X * 2, fs);
            List<String> valueLines = engine.wrap(row.value(), valueWidth - CELL_PAD_X * 2, fs);
            int maxLines = Math.max(Math.max(labelLines.size(), valueLines.size()), 1);
            float rowHeight = maxLines * lineHeight + CELL_PAD_Y * 2;

            engine.ensureSpace(rowHeight);
            float topY = engine.cursorY();
            // Header-style label cell with subtle background
            engine.drawFilledRect(left, topY - rowHeight, labelWidth, rowHeight, PdfLayoutEngine.COLOR_BG_HEADER);
            // Borders
            engine.drawStrokedRect(left, topY - rowHeight, labelWidth, rowHeight, PdfLayoutEngine.COLOR_BORDER, 0.4f);
            engine.drawStrokedRect(left + labelWidth, topY - rowHeight, valueWidth, rowHeight,
                    PdfLayoutEngine.COLOR_BORDER, 0.4f);
            // Text
            float textStartY = topY - CELL_PAD_Y - fs;
            renderLines(labelLines, left + CELL_PAD_X, textStartY, fs, PdfLayoutEngine.COLOR_TEXT);
            renderLines(valueLines, left + labelWidth + CELL_PAD_X, textStartY, fs, PdfLayoutEngine.COLOR_TEXT);
            engine.setCursorY(topY - rowHeight);
        }
    }

    // ────────── Group table ──────────

    private void renderGroupTable(FormBlockResponse group, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        FieldAnswerResponse answer = answers.get(group.id());
        List<GroupItemResponse> items = answer != null && answer.items() != null ? answer.items() : List.of();

        // Determine columns from variants/fields union
        List<TableCol> columns = buildGroupColumns(group);
        // Add "No" column at the front
        List<TableCol> allColumns = new ArrayList<>();
        allColumns.add(new TableCol("__no__", "No", 0.06f, "center"));
        allColumns.addAll(columns);

        if (allColumns.size() <= 1) {
            // Nothing meaningful to show — skip
            return;
        }

        float fs = engine.baseFontSize();
        float headerFs = Math.max(fs, engine.labelFontSize() * 1.05f);
        float lineHeight = engine.lineHeight(fs);
        float headerHeight = engine.lineHeight(headerFs) + CELL_PAD_Y * 2;
        float[] colWidths = computeColumnWidths(allColumns, width);

        engine.ensureSpace(headerHeight + lineHeight + 4f);
        float topY = engine.cursorY();

        // Header row with light gray background
        engine.drawFilledRect(left, topY - headerHeight, width, headerHeight, PdfLayoutEngine.COLOR_BG_HEADER);
        renderTableHeaderRow(allColumns, colWidths, left, topY - CELL_PAD_Y - headerFs, headerFs);

        float currentY = topY - headerHeight;

        if (items.isEmpty()) {
            float emptyHeight = lineHeight + CELL_PAD_Y * 2;
            engine.ensureSpace(emptyHeight);
            engine.drawText("（未入力）", left + CELL_PAD_X, currentY - CELL_PAD_Y - fs, fs,
                    PdfLayoutEngine.COLOR_TEXT_MUTED);
            currentY -= emptyHeight;
        } else {
            for (int i = 0; i < items.size(); i++) {
                GroupItemResponse item = items.get(i);
                Map<String, FieldAnswerResponse> itemAnswers = indexAnswers(item.answers());
                List<FormBlockResponse> itemFields = resolveItemFields(group, item.variantId());
                Map<String, FormBlockResponse> itemFieldsById = indexBlocks(itemFields);

                float rowHeight = computeRowHeight(allColumns, colWidths, itemFieldsById, itemAnswers, fs);
                engine.ensureSpace(rowHeight);

                renderTableDataRow(allColumns, colWidths, left, currentY - CELL_PAD_Y - fs, fs,
                        itemFieldsById, itemAnswers, i);
                drawHorizontalSeparator(left, left + width, currentY - rowHeight,
                        PdfLayoutEngine.COLOR_BORDER, 0.3f);

                currentY -= rowHeight;
            }
        }

        // Outer table border
        engine.drawStrokedRect(left, currentY, width, topY - currentY, PdfLayoutEngine.COLOR_BORDER, 0.5f);
        drawColumnSeparators(left, currentY, colWidths, topY - currentY,
                PdfLayoutEngine.COLOR_BORDER, 0.4f);
        // Header underline
        engine.drawHorizontalLine(left, left + width, topY - headerHeight,
                PdfLayoutEngine.COLOR_BORDER, 0.5f);

        engine.setCursorY(currentY);
    }

    private void drawHorizontalSeparator(float x1, float x2, float y, Color color, float lineWidth) throws IOException {
        engine.drawHorizontalLine(x1, x2, y, color, lineWidth);
    }

    private record TableCol(String fieldId, String header, Float widthHint, String align) {
    }

    private List<TableCol> buildGroupColumns(FormBlockResponse group) {
        // Union of all variant fields (or fields if no variants)
        List<TableCol> cols = new ArrayList<>();
        Map<String, Boolean> seen = new LinkedHashMap<>();
        List<List<FormBlockResponse>> sources = new ArrayList<>();
        if (group.variants() != null && !group.variants().isEmpty()) {
            for (VariantResponse v : group.variants()) sources.add(v.fields());
        } else if (group.fields() != null) {
            sources.add(group.fields());
        }
        for (List<FormBlockResponse> fields : sources) {
            for (FormBlockResponse f : fields) {
                if (options.isHidden(f.id())) continue;
                if ("SECTION".equals(f.type())) continue;
                if (seen.containsKey(f.id())) continue;
                seen.put(f.id(), true);
                String header = options.labelFor(f.id(), f.label());
                String align = "BOOLEAN".equals(f.type()) ? "center" : "left";
                cols.add(new TableCol(f.id(), header, columnWidthHintFor(f), align));
            }
        }
        return cols;
    }

    private Float columnWidthHintFor(FormBlockResponse field) {
        return switch (field.type()) {
            case "BOOLEAN" -> 0.08f;
            case "SHORT_TEXT" -> 0.18f;
            case "SINGLE_SELECT" -> 0.14f;
            case "MULTI_SELECT", "CHECKBOX" -> 0.18f;
            case "REPEATABLE_GROUP" -> 0.18f;
            default -> null; // auto
        };
    }

    private float[] computeColumnWidths(List<TableCol> cols, float totalWidth) {
        float[] widths = new float[cols.size()];
        float assigned = 0f;
        int unset = 0;
        for (int i = 0; i < cols.size(); i++) {
            Float hint = cols.get(i).widthHint();
            if (hint != null) {
                widths[i] = totalWidth * hint;
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
        } else if (assigned > 0) {
            float scale = totalWidth / assigned;
            for (int i = 0; i < widths.length; i++) widths[i] *= scale;
        }
        return widths;
    }

    private float computeRowHeight(List<TableCol> cols, float[] widths,
            Map<String, FormBlockResponse> itemFieldsById, Map<String, FieldAnswerResponse> answers, float fs)
            throws IOException {
        float lineHeight = engine.lineHeight(fs);
        int maxLines = 1;
        for (int i = 0; i < cols.size(); i++) {
            TableCol col = cols.get(i);
            String text = "__no__".equals(col.fieldId())
                    ? "1"
                    : formatCellValue(itemFieldsById.get(col.fieldId()), answers.get(col.fieldId()));
            List<String> lines = engine.wrap(text, widths[i] - CELL_PAD_X * 2, fs);
            if (lines.size() > maxLines) maxLines = lines.size();
        }
        return maxLines * lineHeight + CELL_PAD_Y * 2;
    }

    private void renderTableHeaderRow(List<TableCol> cols, float[] widths, float left, float baselineY,
            float fs) throws IOException {
        float x = left;
        for (int i = 0; i < cols.size(); i++) {
            TableCol col = cols.get(i);
            drawCellText(col.header(), x, baselineY, widths[i], fs, col.align(), PdfLayoutEngine.COLOR_TEXT);
            x += widths[i];
        }
    }

    private void renderTableDataRow(List<TableCol> cols, float[] widths, float left, float baselineY, float fs,
            Map<String, FormBlockResponse> itemFieldsById, Map<String, FieldAnswerResponse> answers, int index)
            throws IOException {
        float x = left;
        for (int i = 0; i < cols.size(); i++) {
            TableCol col = cols.get(i);
            String text;
            if ("__no__".equals(col.fieldId())) {
                text = String.valueOf(index + 1);
            } else {
                text = formatCellValue(itemFieldsById.get(col.fieldId()), answers.get(col.fieldId()));
            }
            drawCellText(text, x, baselineY, widths[i], fs, col.align(), PdfLayoutEngine.COLOR_TEXT);
            x += widths[i];
        }
    }

    private void drawCellText(String text, float x, float baselineY, float cellWidth, float fs, String align,
            Color color) throws IOException {
        if (text == null || text.isEmpty()) return;
        List<String> lines = engine.wrap(text, cellWidth - CELL_PAD_X * 2, fs);
        float lineY = baselineY;
        for (String line : lines) {
            float drawX;
            if ("center".equalsIgnoreCase(align)) {
                float tw = engine.measureTextWidth(line, fs);
                drawX = x + (cellWidth - tw) / 2f;
            } else if ("right".equalsIgnoreCase(align)) {
                float tw = engine.measureTextWidth(line, fs);
                drawX = x + cellWidth - tw - CELL_PAD_X;
            } else {
                drawX = x + CELL_PAD_X;
            }
            engine.drawText(line, drawX, lineY, fs, color);
            lineY -= engine.lineHeight(fs);
        }
    }

    private void drawColumnSeparators(float left, float bottom, float[] widths, float height, Color color,
            float lineWidth) throws IOException {
        float x = left;
        for (int i = 0; i < widths.length - 1; i++) {
            x += widths[i];
            engine.drawVerticalLine(x, bottom, bottom + height, color, lineWidth);
        }
    }

    // ────────── Cell formatting ──────────

    private String formatCellValue(FormBlockResponse field, FieldAnswerResponse ans) {
        if (field == null || ans == null || ans.values() == null || ans.values().isEmpty()) {
            return "";
        }
        if ("BOOLEAN".equals(field.type())) {
            String v = ans.values().get(0);
            if ("true".equalsIgnoreCase(v)) return "○";
            if ("false".equalsIgnoreCase(v)) return "";
            return String.join("\n", ans.values());
        }
        return String.join("\n", ans.values());
    }

    /** Same as formatCellValue but allows displaying "—" for empty in info-table contexts. */
    private String formatValueWithBreaks(FormBlockResponse block, FieldAnswerResponse answer) {
        if (answer == null || answer.values() == null || answer.values().isEmpty()) {
            return "";
        }
        if ("BOOLEAN".equals(block.type())) {
            String v = answer.values().get(0);
            if ("true".equalsIgnoreCase(v)) return "○";
            if ("false".equalsIgnoreCase(v)) return "—";
        }
        return String.join("\n", answer.values());
    }

    // ────────── Helpers ──────────

    private void renderLines(List<String> lines, float x, float topY, float fontSize, Color color)
            throws IOException {
        float y = topY;
        for (String line : lines) {
            engine.drawText(line, x, y, fontSize, color);
            y -= engine.lineHeight(fontSize);
        }
    }

    private Map<String, FieldAnswerResponse> indexAnswers(List<FieldAnswerResponse> answers) {
        Map<String, FieldAnswerResponse> map = new HashMap<>();
        if (answers == null) return map;
        for (FieldAnswerResponse a : answers) map.put(a.fieldId(), a);
        return map;
    }

    private Map<String, FormBlockResponse> indexBlocks(List<FormBlockResponse> blocks) {
        Map<String, FormBlockResponse> map = new HashMap<>();
        if (blocks == null) return map;
        for (FormBlockResponse b : blocks) map.put(b.id(), b);
        return map;
    }

    private List<FormBlockResponse> resolveItemFields(FormBlockResponse block, String variantId) {
        List<VariantResponse> variants = block.variants();
        if (variants == null || variants.isEmpty()) {
            return block.fields() != null ? block.fields() : List.of();
        }
        if (variantId != null) {
            for (VariantResponse v : variants) {
                if (variantId.equals(v.id())) return v.fields();
            }
        }
        return variants.get(0).fields();
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private float spacing(float base) {
        return base * density;
    }

    private void renderItunesLinks(List<ItunesLinkResponse> links) throws IOException {
        engine.ensureSpace(engine.lineHeight(engine.headingFontSize()) + 20f);
        float topY = engine.cursorY();
        engine.drawText("曲情報 (iTunes)", engine.contentLeft(), topY - engine.headingFontSize(),
                engine.headingFontSize(), PdfLayoutEngine.COLOR_TEXT);
        engine.setCursorY(topY - engine.lineHeight(engine.headingFontSize()));

        float fs = engine.labelFontSize();
        for (ItunesLinkResponse link : links) {
            String line = "♪ " + link.songTitle() + " — " + link.songArtist();
            engine.ensureSpace(engine.lineHeight(fs));
            engine.drawText(line, engine.contentLeft() + 8f, engine.cursorY() - fs, fs,
                    PdfLayoutEngine.COLOR_TEXT);
            engine.setCursorY(engine.cursorY() - engine.lineHeight(fs));
        }
    }
}

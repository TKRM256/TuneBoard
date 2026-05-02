package jp.tubeboard.features.lives.pdf;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
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
 * Renders a single setting-sheet submission into a {@link PdfLayoutEngine} with
 * a clean hierarchical layout: thin header → sections with rules → group items
 * laid out as titled rows with two-column field grids.
 */
public class SubmissionPdfRenderer {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy/M/d", Locale.JAPAN);
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy/M/d HH:mm",
            Locale.JAPAN);
    private static final float COLUMN_GAP = 8f;
    private static final float SECTION_INDENT = 4f;
    private static final float ITEM_INDENT = 8f;
    private static final float SECTION_RULE_OFFSET = 3f;

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
        renderHeader(live, submission);
        Map<String, FieldAnswerResponse> answers = indexAnswers(submission.answers());
        renderBlocks(config.blocks(), answers, engine.contentLeft(), engine.contentWidth());
        if (Boolean.TRUE.equals(options.includeItunesLinks()) && submission.itunesLinks() != null
                && !submission.itunesLinks().isEmpty()) {
            renderItunesLinks(submission.itunesLinks());
        }
    }

    private Map<String, FieldAnswerResponse> indexAnswers(List<FieldAnswerResponse> answers) {
        Map<String, FieldAnswerResponse> map = new HashMap<>();
        if (answers == null) return map;
        for (FieldAnswerResponse a : answers) map.put(a.fieldId(), a);
        return map;
    }

    // ────────── Header ──────────

    private void renderHeader(LiveResponse live, PublicSettingSheetSubmissionDetailResponse submission)
            throws IOException {
        PdfHeaderOptions h = options.header();
        float left = engine.contentLeft();
        float right = engine.contentRight();
        float topY = engine.cursorY();

        if (Boolean.TRUE.equals(h.showTenantName()) && hasText(live.tenantName())) {
            engine.drawText(live.tenantName(), left, topY - 9f, 9f, PdfLayoutEngine.COLOR_TEXT_MUTED);
        }
        String meta = buildLiveMeta(live, h);
        if (!meta.isEmpty()) {
            float w = engine.measureTextWidth(meta, 9f);
            engine.drawText(meta, right - w, topY - 9f, 9f, PdfLayoutEngine.COLOR_TEXT_MUTED);
        }

        float titleY = topY - (Boolean.TRUE.equals(h.showTenantName()) ? 14f : 0f) - engine.titleFontSize();
        if (Boolean.TRUE.equals(h.showLiveName()) && hasText(live.name())) {
            engine.drawText(live.name(), left, titleY, engine.titleFontSize(), PdfLayoutEngine.COLOR_TEXT);
        }

        float underlineY = titleY - 4f;
        engine.drawHorizontalLine(left, right, underlineY, PdfLayoutEngine.COLOR_BORDER_STRONG, 0.8f);

        float labelY = underlineY - 6f - engine.headingFontSize();
        if (Boolean.TRUE.equals(h.showRecordLabel()) && hasText(submission.recordLabel())) {
            engine.drawText(submission.recordLabel(), left, labelY, engine.headingFontSize(),
                    PdfLayoutEngine.COLOR_TEXT);
        }

        String rightInfo = buildHeaderRightInfo(submission, h);
        if (!rightInfo.isEmpty()) {
            float w = engine.measureTextWidth(rightInfo, 9f);
            engine.drawText(rightInfo, right - w, labelY, 9f, PdfLayoutEngine.COLOR_TEXT_MUTED);
        }

        engine.setCursorY(labelY - spacing(8f));
    }

    private String buildLiveMeta(LiveResponse live, PdfHeaderOptions h) {
        StringBuilder sb = new StringBuilder();
        if (Boolean.TRUE.equals(h.showLiveDate()) && live.date() != null) {
            sb.append(DATE_FORMAT.format(live.date()));
        }
        if (Boolean.TRUE.equals(h.showLiveLocation()) && hasText(live.location())) {
            if (sb.length() > 0) sb.append(" / ");
            sb.append(live.location());
        }
        return sb.toString();
    }

    private String buildHeaderRightInfo(PublicSettingSheetSubmissionDetailResponse submission, PdfHeaderOptions h) {
        StringBuilder sb = new StringBuilder();
        if (Boolean.TRUE.equals(h.showSubmissionStatus()) && hasText(submission.submissionStatus())) {
            sb.append(submission.submissionStatus());
        }
        if (Boolean.TRUE.equals(h.showSubmittedAt()) && submission.submittedAt() != null) {
            if (sb.length() > 0) sb.append("  ｜  ");
            sb.append("提出: ").append(DATETIME_FORMAT.format(submission.submittedAt()));
        }
        return sb.toString();
    }

    // ────────── Blocks ──────────

    private void renderBlocks(List<FormBlockResponse> blocks, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        if (blocks == null) return;
        for (FormBlockResponse block : blocks) {
            if (options.isHidden(block.id())) continue;
            renderBlock(block, answers, left, width);
            engine.setCursorY(engine.cursorY() - spacing(6f));
        }
    }

    private void renderBlock(FormBlockResponse block, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        FieldAnswerResponse answer = answers.get(block.id());
        switch (block.type()) {
            case "SECTION" -> renderSection(block, answers, left, width);
            case "REPEATABLE_GROUP" -> renderGroup(block, answer, left, width);
            default -> renderLeaf(block, answer, left, width, false);
        }
    }

    private void renderSection(FormBlockResponse block, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        engine.ensureSpace(engine.lineHeight(engine.headingFontSize()) + 30f);
        float topY = engine.cursorY();
        String label = options.labelFor(block.id(), block.label());
        engine.drawText(label, left, topY - engine.headingFontSize(), engine.headingFontSize(),
                PdfLayoutEngine.COLOR_TEXT);
        float ruleY = topY - engine.headingFontSize() - SECTION_RULE_OFFSET;
        engine.drawHorizontalLine(left, left + width, ruleY, PdfLayoutEngine.COLOR_BORDER, 0.6f);
        engine.setCursorY(ruleY - spacing(4f));

        if (hasText(block.description())) {
            float descSize = engine.labelFontSize();
            List<String> lines = engine.wrap(block.description(), width - SECTION_INDENT, descSize);
            float endY = engine.drawLines(lines, left + SECTION_INDENT, engine.cursorY(), descSize,
                    PdfLayoutEngine.COLOR_TEXT_MUTED);
            engine.setCursorY(endY - spacing(2f));
        }

        if (block.fields() != null && !block.fields().isEmpty()) {
            renderTwoColumnFields(block.fields(), answers, left + SECTION_INDENT,
                    width - SECTION_INDENT * 2);
        }
    }

    private void renderGroup(FormBlockResponse block, FieldAnswerResponse answer, float left, float width)
            throws IOException {
        List<GroupItemResponse> items = answer != null && answer.items() != null ? answer.items() : List.of();

        engine.ensureSpace(engine.lineHeight(engine.headingFontSize()) + 20f);
        float topY = engine.cursorY();
        String label = options.labelFor(block.id(), block.label()) + "（" + items.size() + "件）";
        engine.drawText(label, left, topY - engine.headingFontSize(), engine.headingFontSize(),
                PdfLayoutEngine.COLOR_TEXT);
        float ruleY = topY - engine.headingFontSize() - SECTION_RULE_OFFSET;
        engine.drawHorizontalLine(left, left + width, ruleY, PdfLayoutEngine.COLOR_BORDER, 0.6f);
        engine.setCursorY(ruleY - spacing(4f));

        if (items.isEmpty()) {
            engine.drawText("未入力", left + ITEM_INDENT, engine.cursorY() - engine.labelFontSize(),
                    engine.labelFontSize(), PdfLayoutEngine.COLOR_TEXT_MUTED);
            engine.setCursorY(engine.cursorY() - engine.lineHeight(engine.labelFontSize()) - spacing(2f));
            return;
        }

        for (int i = 0; i < items.size(); i++) {
            renderGroupItem(block, items.get(i), i, left, width);
            if (i < items.size() - 1) {
                engine.setCursorY(engine.cursorY() - spacing(2f));
                engine.drawHorizontalLine(left + ITEM_INDENT, left + width, engine.cursorY(),
                        PdfLayoutEngine.COLOR_BORDER, 0.3f);
                engine.setCursorY(engine.cursorY() - spacing(4f));
            }
        }
    }

    private void renderGroupItem(FormBlockResponse block, GroupItemResponse item, int index, float left,
            float width) throws IOException {
        Map<String, FieldAnswerResponse> itemAnswers = indexAnswers(item.answers());
        List<FormBlockResponse> fields = resolveItemFields(block, item.variantId());
        String title = resolveItemTitle(block, itemAnswers, index);

        engine.ensureSpace(engine.lineHeight(engine.labelFontSize()) + 20f);
        float topY = engine.cursorY();
        engine.drawText(title, left + ITEM_INDENT, topY - engine.labelFontSize(),
                engine.labelFontSize(), PdfLayoutEngine.COLOR_TEXT);
        engine.setCursorY(topY - engine.lineHeight(engine.labelFontSize()) - spacing(1f));

        renderTwoColumnFields(fields, itemAnswers, left + ITEM_INDENT * 2,
                width - ITEM_INDENT * 2 - SECTION_INDENT);
    }

    private void renderTwoColumnFields(List<FormBlockResponse> fields, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        float halfWidth = (width - COLUMN_GAP) / 2f;
        float startY = engine.cursorY();
        float[] columnY = new float[] { startY, startY };
        for (FormBlockResponse field : fields) {
            if (options.isHidden(field.id())) continue;
            FieldAnswerResponse a = answers.get(field.id());
            if (isFullWidthBlock(field)) {
                float syncY = Math.min(columnY[0], columnY[1]);
                engine.setCursorY(syncY);
                renderBlock(field, answers, left, width);
                engine.setCursorY(engine.cursorY() - spacing(4f));
                columnY[0] = engine.cursorY();
                columnY[1] = engine.cursorY();
            } else {
                int col = columnY[0] >= columnY[1] ? 0 : 1;
                float colLeft = left + (col == 0 ? 0 : halfWidth + COLUMN_GAP);
                engine.setCursorY(columnY[col]);
                renderLeaf(field, a, colLeft, halfWidth, true);
                columnY[col] = engine.cursorY() - spacing(3f);
            }
        }
        engine.setCursorY(Math.min(columnY[0], columnY[1]));
    }

    private boolean isFullWidthBlock(FormBlockResponse block) {
        if ("LONG_TEXT".equals(block.type()) || "SECTION".equals(block.type())
                || "REPEATABLE_GROUP".equals(block.type())) {
            return true;
        }
        return block.layout() != null && "full".equals(block.layout().width());
    }

    private void renderLeaf(FormBlockResponse block, FieldAnswerResponse answer, float left, float width,
            boolean nested) throws IOException {
        float labelFontSize = engine.labelFontSize();
        float valueFontSize = engine.baseFontSize();
        String value = formatValue(block, answer);
        String label = options.labelFor(block.id(), block.label());

        List<String> valueLines = engine.wrap(value, width, valueFontSize);
        if (valueLines.isEmpty()) valueLines = List.of("");

        float labelHeight = engine.lineHeight(labelFontSize);
        float valueHeight = valueLines.size() * engine.lineHeight(valueFontSize);
        float totalHeight = labelHeight + valueHeight + spacing(2f);

        engine.ensureSpace(totalHeight);
        float topY = engine.cursorY();
        engine.drawText(label, left, topY - labelFontSize, labelFontSize, PdfLayoutEngine.COLOR_TEXT_MUTED);

        float lineY = topY - labelHeight - valueFontSize;
        for (String line : valueLines) {
            engine.drawText(line, left, lineY, valueFontSize, PdfLayoutEngine.COLOR_TEXT);
            lineY -= engine.lineHeight(valueFontSize);
        }
        engine.setCursorY(topY - totalHeight);

        if (!nested) {
            // Visual hint of grouping: thin separator below stand-alone leaves.
            engine.drawHorizontalLine(left, left + width, engine.cursorY() + spacing(1.5f),
                    PdfLayoutEngine.COLOR_BORDER, 0.2f);
        }
    }

    private String formatValue(FormBlockResponse block, FieldAnswerResponse answer) {
        if (answer == null || answer.values() == null || answer.values().isEmpty()) {
            return "—";
        }
        if ("BOOLEAN".equals(block.type())) {
            String v = answer.values().get(0);
            if ("true".equalsIgnoreCase(v)) return "✓ はい";
            if ("false".equalsIgnoreCase(v)) return "いいえ";
            return String.join(" / ", answer.values());
        }
        return String.join(" / ", answer.values());
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

    private String resolveItemTitle(FormBlockResponse block, Map<String, FieldAnswerResponse> answers, int index) {
        String prefix = (block.entryTitle() != null && !block.entryTitle().isBlank()
                ? block.entryTitle()
                : block.label()) + " " + (index + 1);
        if (block.titleSourceFieldId() == null || block.titleSourceFieldId().isBlank()) {
            return prefix;
        }
        FieldAnswerResponse src = answers.get(block.titleSourceFieldId());
        if (src == null || src.values() == null || src.values().isEmpty()) return prefix;
        String first = src.values().get(0);
        if (first == null || first.isBlank()) return prefix;
        return prefix + " ｜ " + first.trim();
    }

    // ────────── iTunes ──────────

    private void renderItunesLinks(List<ItunesLinkResponse> links) throws IOException {
        engine.ensureSpace(engine.lineHeight(engine.headingFontSize()) + 20f);
        float topY = engine.cursorY();
        engine.drawText("曲情報 (iTunes)", engine.contentLeft(), topY - engine.headingFontSize(),
                engine.headingFontSize(), PdfLayoutEngine.COLOR_TEXT);
        float ruleY = topY - engine.headingFontSize() - SECTION_RULE_OFFSET;
        engine.drawHorizontalLine(engine.contentLeft(), engine.contentRight(), ruleY,
                PdfLayoutEngine.COLOR_BORDER, 0.6f);
        engine.setCursorY(ruleY - spacing(4f));

        float fs = engine.labelFontSize();
        for (ItunesLinkResponse link : links) {
            String line = "♪ " + link.songTitle() + " — " + link.songArtist();
            engine.ensureSpace(engine.lineHeight(fs));
            engine.drawText(line, engine.contentLeft() + ITEM_INDENT, engine.cursorY() - fs, fs,
                    PdfLayoutEngine.COLOR_TEXT);
            engine.setCursorY(engine.cursorY() - engine.lineHeight(fs));
        }
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private float spacing(float base) {
        return base * density;
    }
}

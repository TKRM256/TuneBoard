package jp.tubeboard.features.lives.pdf;

import java.awt.Color;
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
 * Renders a single setting-sheet submission into a {@link PdfLayoutEngine},
 * laying out blocks top-down with light grid usage for nested fields.
 */
public class SubmissionPdfRenderer {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy/M/d", Locale.JAPAN);
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy/M/d HH:mm",
            Locale.JAPAN);
    private static final float SPACING = 5f;
    private static final float SECTION_INNER_PAD = 6f;
    private static final float CARD_INNER_PAD = 5f;
    private static final float COLUMN_GAP = 6f;

    private final PdfLayoutEngine engine;
    private final boolean includeItunesLinks;

    public SubmissionPdfRenderer(PdfLayoutEngine engine, boolean includeItunesLinks) {
        this.engine = engine;
        this.includeItunesLinks = includeItunesLinks;
    }

    public void render(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission) throws IOException {
        engine.newPage();
        renderHeader(live, submission);
        Map<String, FieldAnswerResponse> answerMap = indexAnswers(submission.answers());
        renderBlocks(config.blocks(), answerMap, engine.contentLeft(), engine.contentWidth());
        if (includeItunesLinks && submission.itunesLinks() != null && !submission.itunesLinks().isEmpty()) {
            renderItunesLinks(submission.itunesLinks());
        }
    }

    private Map<String, FieldAnswerResponse> indexAnswers(List<FieldAnswerResponse> answers) {
        Map<String, FieldAnswerResponse> map = new HashMap<>();
        if (answers == null) {
            return map;
        }
        for (FieldAnswerResponse a : answers) {
            map.put(a.fieldId(), a);
        }
        return map;
    }

    private void renderHeader(LiveResponse live, PublicSettingSheetSubmissionDetailResponse submission)
            throws IOException {
        float x = engine.contentLeft();
        float topY = engine.cursorY();

        engine.drawText(live.tenantName() == null ? "" : live.tenantName(), x, topY - 9f, 9f,
                PdfLayoutEngine.COLOR_TEXT_MUTED);
        float titleY = topY - 12f - engine.titleFontSize();
        engine.drawText(live.name() == null ? "" : live.name(), x, titleY, engine.titleFontSize(),
                PdfLayoutEngine.COLOR_TEXT);

        String meta = buildLiveMeta(live);
        if (!meta.isEmpty()) {
            float metaWidth = engine.measureTextWidth(meta, 9f);
            engine.drawText(meta, engine.contentRight() - metaWidth, topY - 9f, 9f, PdfLayoutEngine.COLOR_TEXT_MUTED);
        }

        float underlineY = titleY - 4f;
        engine.drawHorizontalLine(x, engine.contentRight(), underlineY, PdfLayoutEngine.COLOR_BORDER_STRONG, 0.8f);

        float labelY = underlineY - 6f - engine.headingFontSize();
        engine.drawText(submission.recordLabel() == null ? "" : submission.recordLabel(), x, labelY,
                engine.headingFontSize(), PdfLayoutEngine.COLOR_TEXT);

        String submittedAt = submission.submittedAt() != null
                ? "提出: " + DATETIME_FORMAT.format(submission.submittedAt())
                : "";
        if (!submittedAt.isEmpty()) {
            float w = engine.measureTextWidth(submittedAt, 9f);
            engine.drawText(submittedAt, engine.contentRight() - w, labelY, 9f, PdfLayoutEngine.COLOR_TEXT_MUTED);
        }

        engine.setCursorY(labelY - SPACING * 2);
    }

    private String buildLiveMeta(LiveResponse live) {
        StringBuilder sb = new StringBuilder();
        if (live.date() != null) {
            sb.append(DATE_FORMAT.format(live.date()));
        }
        if (live.location() != null && !live.location().isBlank()) {
            if (sb.length() > 0) sb.append(" / ");
            sb.append(live.location());
        }
        return sb.toString();
    }

    private void renderBlocks(List<FormBlockResponse> blocks, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        if (blocks == null) return;
        for (FormBlockResponse block : blocks) {
            renderBlock(block, answers, left, width);
            engine.setCursorY(engine.cursorY() - SPACING);
        }
    }

    private void renderBlock(FormBlockResponse block, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        FieldAnswerResponse answer = answers.get(block.id());
        switch (block.type()) {
            case "SECTION" -> renderSection(block, answers, left, width);
            case "REPEATABLE_GROUP" -> renderGroup(block, answer, left, width);
            default -> renderLeaf(block, answer, left, width);
        }
    }

    private void renderSection(FormBlockResponse block, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        float headerHeight = engine.lineHeight(engine.headingFontSize()) + 4f;
        engine.ensureSpace(headerHeight + 30f);

        float topY = engine.cursorY();
        engine.drawFilledRect(left, topY - headerHeight, width, headerHeight, PdfLayoutEngine.COLOR_BG_HEADER);
        engine.drawText(block.label(), left + 6f, topY - headerHeight + 4f, engine.headingFontSize(),
                PdfLayoutEngine.COLOR_TEXT);

        float afterHeaderY = topY - headerHeight - 2f;
        engine.setCursorY(afterHeaderY);

        if (hasText(block.description())) {
            float descFontSize = engine.labelFontSize();
            List<String> lines = engine.wrap(block.description(), width - 12f, descFontSize);
            float endY = engine.drawLines(lines, left + 6f, engine.cursorY(), descFontSize,
                    PdfLayoutEngine.COLOR_TEXT_MUTED);
            engine.setCursorY(endY - 2f);
        }

        if (block.fields() != null && !block.fields().isEmpty()) {
            renderTwoColumnFields(block.fields(), answers, left + SECTION_INNER_PAD,
                    width - SECTION_INNER_PAD * 2);
        }
    }

    private void renderGroup(FormBlockResponse block, FieldAnswerResponse answer, float left, float width)
            throws IOException {
        List<GroupItemResponse> items = answer != null && answer.items() != null ? answer.items() : List.of();

        float headerHeight = engine.lineHeight(engine.headingFontSize()) + 2f;
        engine.ensureSpace(headerHeight + 20f);

        float topY = engine.cursorY();
        String label = block.label() + "（" + items.size() + "件）";
        engine.drawText(label, left, topY - engine.headingFontSize(), engine.headingFontSize(),
                PdfLayoutEngine.COLOR_TEXT);
        engine.setCursorY(topY - headerHeight);

        if (items.isEmpty()) {
            float emptyHeight = 18f;
            engine.ensureSpace(emptyHeight);
            float y = engine.cursorY();
            engine.drawStrokedRect(left, y - emptyHeight, width, emptyHeight, PdfLayoutEngine.COLOR_BORDER, 0.4f);
            engine.drawText("未入力", left + 6f, y - emptyHeight + 5f, engine.labelFontSize(),
                    PdfLayoutEngine.COLOR_TEXT_MUTED);
            engine.setCursorY(y - emptyHeight);
            return;
        }

        for (int i = 0; i < items.size(); i++) {
            renderGroupItem(block, items.get(i), i, left, width);
            engine.setCursorY(engine.cursorY() - 3f);
        }
    }

    private void renderGroupItem(FormBlockResponse block, GroupItemResponse item, int index, float left,
            float width) throws IOException {
        Map<String, FieldAnswerResponse> itemAnswers = indexAnswers(item.answers());
        List<FormBlockResponse> fields = resolveItemFields(block, item.variantId());
        String title = resolveItemTitle(block, itemAnswers, index);

        engine.ensureSpace(40f);
        float topY = engine.cursorY();
        float titleHeight = engine.lineHeight(engine.labelFontSize()) + 2f;

        float estimatedFieldsHeight = estimateFieldsHeight(fields, itemAnswers, width - CARD_INNER_PAD * 2);
        float totalHeight = titleHeight + estimatedFieldsHeight + CARD_INNER_PAD * 2;

        engine.drawFilledRect(left, topY - totalHeight, width, totalHeight, PdfLayoutEngine.COLOR_BG_SUBTLE);
        engine.drawStrokedRect(left, topY - totalHeight, width, totalHeight, PdfLayoutEngine.COLOR_BORDER, 0.4f);

        engine.drawText(title, left + CARD_INNER_PAD, topY - CARD_INNER_PAD - engine.labelFontSize(),
                engine.labelFontSize(), PdfLayoutEngine.COLOR_TEXT);
        engine.setCursorY(topY - CARD_INNER_PAD - titleHeight);

        renderTwoColumnFields(fields, itemAnswers, left + CARD_INNER_PAD, width - CARD_INNER_PAD * 2);

        // Snap cursor to bottom of the card so the next item sits below.
        engine.setCursorY(topY - totalHeight);
    }

    private float estimateFieldsHeight(List<FormBlockResponse> fields, Map<String, FieldAnswerResponse> answers,
            float width) throws IOException {
        // Simple estimator: assume 2-col layout for narrow fields, full width for wide ones.
        float halfWidth = (width - COLUMN_GAP) / 2f;
        float[] columnY = new float[] { 0f, 0f };
        for (FormBlockResponse field : fields) {
            FieldAnswerResponse a = answers.get(field.id());
            if (isFullWidthBlock(field)) {
                float syncY = Math.min(columnY[0], columnY[1]);
                float h = estimateBlockHeight(field, a, width);
                columnY[0] = syncY - h - SPACING;
                columnY[1] = columnY[0];
            } else {
                int col = columnY[0] >= columnY[1] ? 0 : 1;
                float h = estimateBlockHeight(field, a, halfWidth);
                columnY[col] -= h + SPACING;
            }
        }
        return -Math.min(columnY[0], columnY[1]);
    }

    private float estimateBlockHeight(FormBlockResponse block, FieldAnswerResponse answer, float width)
            throws IOException {
        if ("REPEATABLE_GROUP".equals(block.type())) {
            int items = answer != null && answer.items() != null ? answer.items().size() : 0;
            return engine.lineHeight(engine.headingFontSize()) + Math.max(items, 1) * 50f;
        }
        if ("SECTION".equals(block.type())) {
            return engine.lineHeight(engine.headingFontSize()) + 30f;
        }
        float labelHeight = engine.lineHeight(engine.labelFontSize());
        String value = formatValue(block, answer);
        List<String> lines = engine.wrap(value, width - 6f, engine.baseFontSize());
        if (lines.isEmpty()) lines = List.of("");
        float valueHeight = lines.size() * engine.lineHeight(engine.baseFontSize());
        return labelHeight + valueHeight + 8f;
    }

    private void renderTwoColumnFields(List<FormBlockResponse> fields, Map<String, FieldAnswerResponse> answers,
            float left, float width) throws IOException {
        float halfWidth = (width - COLUMN_GAP) / 2f;
        float startY = engine.cursorY();
        float[] columnY = new float[] { startY, startY };
        for (FormBlockResponse field : fields) {
            FieldAnswerResponse a = answers.get(field.id());
            if (isFullWidthBlock(field)) {
                float syncY = Math.min(columnY[0], columnY[1]);
                engine.setCursorY(syncY);
                renderBlock(field, answers, left, width);
                engine.setCursorY(engine.cursorY() - SPACING);
                columnY[0] = engine.cursorY();
                columnY[1] = engine.cursorY();
            } else {
                int col = columnY[0] >= columnY[1] ? 0 : 1;
                float colLeft = left + (col == 0 ? 0 : halfWidth + COLUMN_GAP);
                engine.setCursorY(columnY[col]);
                renderLeaf(field, a, colLeft, halfWidth);
                columnY[col] = engine.cursorY() - SPACING;
            }
        }
        engine.setCursorY(Math.min(columnY[0], columnY[1]));
    }

    private boolean isFullWidthBlock(FormBlockResponse block) {
        if ("LONG_TEXT".equals(block.type()) || "SECTION".equals(block.type())
                || "REPEATABLE_GROUP".equals(block.type())) {
            return true;
        }
        if (block.layout() != null && "full".equals(block.layout().width())) {
            return true;
        }
        return false;
    }

    private void renderLeaf(FormBlockResponse block, FieldAnswerResponse answer, float left, float width)
            throws IOException {
        float labelFontSize = engine.labelFontSize();
        float valueFontSize = engine.baseFontSize();
        String value = formatValue(block, answer);

        List<String> valueLines = engine.wrap(value, width - 6f, valueFontSize);
        if (valueLines.isEmpty()) valueLines = List.of("");

        float labelHeight = engine.lineHeight(labelFontSize);
        float valueHeight = valueLines.size() * engine.lineHeight(valueFontSize);
        float totalHeight = labelHeight + valueHeight + 6f;

        engine.ensureSpace(totalHeight);
        float topY = engine.cursorY();
        engine.drawStrokedRect(left, topY - totalHeight, width, totalHeight, PdfLayoutEngine.COLOR_BORDER, 0.3f);
        engine.drawText(block.label(), left + 4f, topY - labelHeight, labelFontSize,
                PdfLayoutEngine.COLOR_TEXT_MUTED);

        float lineY = topY - labelHeight - valueFontSize;
        for (String line : valueLines) {
            engine.drawText(line, left + 4f, lineY, valueFontSize, PdfLayoutEngine.COLOR_TEXT);
            lineY -= engine.lineHeight(valueFontSize);
        }
        engine.setCursorY(topY - totalHeight);
    }

    private String formatValue(FormBlockResponse block, FieldAnswerResponse answer) {
        if (answer == null || answer.values() == null || answer.values().isEmpty()) {
            return "未入力";
        }
        if ("BOOLEAN".equals(block.type())) {
            String v = answer.values().get(0);
            if ("true".equalsIgnoreCase(v)) return "はい";
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
                if (variantId.equals(v.id())) {
                    return v.fields();
                }
            }
        }
        return variants.get(0).fields();
    }

    private String resolveItemTitle(FormBlockResponse block, Map<String, FieldAnswerResponse> answers, int index) {
        String fallback = (block.entryTitle() != null && !block.entryTitle().isBlank()
                ? block.entryTitle()
                : block.label()) + " " + (index + 1);
        if (block.titleSourceFieldId() == null || block.titleSourceFieldId().isBlank()) {
            return fallback;
        }
        FieldAnswerResponse src = answers.get(block.titleSourceFieldId());
        if (src == null || src.values() == null || src.values().isEmpty()) {
            return fallback;
        }
        String first = src.values().get(0);
        if (first == null || first.isBlank()) {
            return fallback;
        }
        return fallback + " ｜ " + first.trim();
    }

    private void renderItunesLinks(List<ItunesLinkResponse> links) throws IOException {
        engine.ensureSpace(20f);
        float topY = engine.cursorY();
        engine.drawText("曲情報 (iTunes)", engine.contentLeft(), topY - engine.headingFontSize(),
                engine.headingFontSize(), PdfLayoutEngine.COLOR_TEXT);
        engine.setCursorY(topY - engine.lineHeight(engine.headingFontSize()));

        float labelFontSize = engine.labelFontSize();
        for (ItunesLinkResponse link : links) {
            String line = "♪ " + link.songTitle() + " — " + link.songArtist();
            engine.ensureSpace(engine.lineHeight(labelFontSize));
            engine.drawText(line, engine.contentLeft(), engine.cursorY() - labelFontSize, labelFontSize,
                    PdfLayoutEngine.COLOR_TEXT);
            engine.setCursorY(engine.cursorY() - engine.lineHeight(labelFontSize));
        }
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    static float mmToPt(float mm) {
        return mm * PdfLayoutEngine.MM_TO_PT;
    }

    @SuppressWarnings("unused")
    private static Color colorWhite() {
        return PdfLayoutEngine.COLOR_WHITE;
    }
}

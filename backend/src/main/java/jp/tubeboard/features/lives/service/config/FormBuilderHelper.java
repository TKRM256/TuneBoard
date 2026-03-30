package jp.tubeboard.features.lives.service.config;

import java.util.List;

import org.springframework.stereotype.Component;

import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.LayoutRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.OptionSourceRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.OptionSourceResponse;
import jp.tubeboard.features.lives.service.SettingSheetConstants;

@Component
public class FormBuilderHelper {
    public String normalizeBlockType(String value) {
        String normalized = safeText(value).toUpperCase();
        return SettingSheetConstants.SUPPORTED_BLOCK_TYPES.contains(normalized)
                ? normalized
                : SettingSheetConstants.BLOCK_SHORT_TEXT;
    }

    public String defaultBlockLabel(String type) {
        return switch (type) {
            case SettingSheetConstants.BLOCK_SECTION -> "セクション見出し";
            case SettingSheetConstants.BLOCK_BOOLEAN -> "チェック項目";
            case SettingSheetConstants.BLOCK_REPEATABLE_GROUP -> "繰り返しグループ";
            case SettingSheetConstants.BLOCK_SONG -> "楽曲";
            default -> "質問";
        };
    }

    public OptionSourceResponse normalizeOptionSource(OptionSourceRequest source) {
        if (source == null) {
            return null;
        }
        String blockId = safeText(source.blockId());
        String fieldId = safeText(source.fieldId());
        return blockId.isBlank() || fieldId.isBlank() ? null : new OptionSourceResponse(blockId, fieldId);
    }

    public LayoutResponse normalizeLayout(LayoutRequest layout) {
        String width = layout == null ? SettingSheetConstants.LAYOUT_FULL : safeText(layout.width()).toLowerCase();
        if (!SettingSheetConstants.LAYOUT_WIDTHS.contains(width)) {
            width = SettingSheetConstants.LAYOUT_FULL;
        }
        int optionColumns = layout == null || layout.optionColumns() == null ? 1 : layout.optionColumns();
        return new LayoutResponse(width, Math.max(1, Math.min(3, optionColumns)),
                layout != null && Boolean.TRUE.equals(layout.optionFitContent()));
    }

    public String normalizeAppearance(String value, String fallback) {
        String normalized = safeText(value).toLowerCase();
        return SettingSheetConstants.APPEARANCES.contains(normalized) ? normalized : fallback;
    }

    public String defaultAppearance(String type) {
        if (SettingSheetConstants.BLOCK_SECTION.equals(type)) {
            return SettingSheetConstants.APPEARANCE_PLAIN;
        }
        if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(type)) {
            return SettingSheetConstants.APPEARANCE_SUBTLE;
        }
        return SettingSheetConstants.APPEARANCE_OUTLINE;
    }

    public List<String> normalizeOptions(List<String> values, List<String> fallback) {
        if (values == null || values.isEmpty()) {
            return fallback;
        }
        List<String> normalized = values.stream().map(this::safeText).filter(value -> !value.isBlank()).distinct()
                .toList();
        return normalized.isEmpty() ? fallback : normalized;
    }

    public FormBlockResponse sectionBlock(String id, String label, String description,
            List<FormBlockResponse> children) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_SECTION, label, description, false, false,
                false, false,
                SettingSheetConstants.APPEARANCE_PLAIN, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                children, layoutFull(1), null, "");
    }

    public FormBlockResponse textBlock(String id, String label, boolean required, LayoutResponse layout) {
        return textBlock(id, label, required, layout, "");
    }

    public FormBlockResponse textBlock(String id, String label, boolean required, LayoutResponse layout,
            String duplicateDetectionRole) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_SHORT_TEXT, label, "", false, false,
                required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null, normalizeDuplicateDetectionRole(duplicateDetectionRole));
    }

    public FormBlockResponse longTextBlock(String id, String label, boolean required, LayoutResponse layout) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_LONG_TEXT, label, "", false, false,
                required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null, "");
    }

    public FormBlockResponse booleanBlock(String id, String label, String description, LayoutResponse layout) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_BOOLEAN, label, description, false, false,
                false, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null, "");
    }

    public FormBlockResponse songBlock(String id, String label, boolean required, LayoutResponse layout) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_SONG, label, "", false, false,
                required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, List.of(), 0, "", "",
                "",
                List.of(), layout, null, "");
    }

    public FormBlockResponse selectBlock(String id, String type, String label, boolean required, List<String> options,
            OptionSourceResponse optionSource, LayoutResponse layout) {
        return new FormBlockResponse(id, type, label, "", false, false, required, false,
                SettingSheetConstants.APPEARANCE_OUTLINE, SettingSheetConstants.APPEARANCE_PLAIN, options, 0, "", "",
                "",
                List.of(), layout, optionSource, "");
    }

    public FormBlockResponse groupBlock(String id, String label, String description, boolean required,
            boolean collapsible, int minItems, String addButtonLabel, String entryTitle, String titleSourceFieldId,
            LayoutResponse layout, List<FormBlockResponse> fields) {
        return new FormBlockResponse(id, SettingSheetConstants.BLOCK_REPEATABLE_GROUP, label, description, false,
                false, required, collapsible, SettingSheetConstants.APPEARANCE_SUBTLE,
                SettingSheetConstants.APPEARANCE_OUTLINE,
                List.of(), minItems, addButtonLabel, entryTitle, titleSourceFieldId, fields, layout, null, "");
    }

    public OptionSourceResponse optionSource(String blockId, String fieldId) {
        return new OptionSourceResponse(blockId, fieldId);
    }

    public LayoutResponse layoutFull(int optionColumns) {
        return new LayoutResponse(SettingSheetConstants.LAYOUT_FULL, optionColumns, false);
    }

    public LayoutResponse layoutHalf(int optionColumns) {
        return new LayoutResponse(SettingSheetConstants.LAYOUT_HALF, optionColumns, false);
    }

    public LayoutResponse layoutTwoThirds(int optionColumns) {
        return new LayoutResponse(SettingSheetConstants.LAYOUT_TWO_THIRDS, optionColumns, false);
    }

    public LayoutResponse layoutThird(int optionColumns) {
        return new LayoutResponse(SettingSheetConstants.LAYOUT_THIRD, optionColumns, false);
    }

    public String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    public String safeTextOrDefault(String value, String fallback) {
        String sanitized = safeText(value);
        return sanitized.isBlank() ? fallback : sanitized;
    }

    public String normalizeDuplicateDetectionRole(String value) {
        String normalized = safeText(value).toUpperCase();
        return SettingSheetConstants.DUPLICATE_DETECTION_ROLES.contains(normalized) ? normalized : "";
    }
}

package jp.tubeboard.features.lives.dto.request;

import java.util.List;

public record SettingSheetConfigUpdateRequest(
                String title,
                String description,
                String submitButtonLabel,
                Boolean publicSubmissionEnabled,
                List<FormBlockRequest> blocks) {

        public record FormBlockRequest(
                        String id,
                        String type,
                        String label,
                        String description,
                        Boolean hidden,
                        Boolean publicVisible,
                        Boolean adminVisible,
                        Boolean required,
                        Boolean collapsible,
                        String appearance,
                        String itemAppearance,
                        List<String> options,
                        Integer minItems,
                        String addButtonLabel,
                        String entryTitle,
                        String titleSourceFieldId,
                        List<FormBlockRequest> fields,
                        LayoutRequest layout,
                        OptionSourceRequest optionSource,
                        String duplicateDetectionRole,
                        List<VariantRequest> variants,
                        Boolean adminOnly) {

                /** adminOnly を持たない旧来の組み立て用。 */
                public FormBlockRequest(String id, String type, String label, String description, Boolean hidden,
                                Boolean publicVisible, Boolean adminVisible, Boolean required, Boolean collapsible,
                                String appearance, String itemAppearance, List<String> options, Integer minItems,
                                String addButtonLabel, String entryTitle, String titleSourceFieldId,
                                List<FormBlockRequest> fields, LayoutRequest layout, OptionSourceRequest optionSource,
                                String duplicateDetectionRole, List<VariantRequest> variants) {
                        this(id, type, label, description, hidden, publicVisible, adminVisible, required, collapsible,
                                        appearance, itemAppearance, options, minItems, addButtonLabel, entryTitle,
                                        titleSourceFieldId, fields, layout, optionSource, duplicateDetectionRole,
                                        variants, null);
                }
        }

        public record VariantRequest(
                        String id,
                        String label,
                        List<FormBlockRequest> fields) {
        }

        public record LayoutRequest(
                        String width,
                        Integer optionColumns,
                        Boolean optionFitContent) {
        }

        public record OptionSourceRequest(
                        String blockId,
                        String fieldId) {
        }
}
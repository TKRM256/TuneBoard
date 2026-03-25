package jp.tubeboard.features.lives.dto.response;

import java.util.List;

public record SettingSheetConfigResponse(
                String title,
                String description,
                String submitButtonLabel,
                Boolean publicSubmissionEnabled,
                String recordLabelFieldId,
                List<FormBlockResponse> blocks) {

        public record FormBlockResponse(
                        String id,
                        String type,
                        String label,
                        String description,
                        Boolean hidden,
                        Boolean publicVisible,
                        Boolean required,
                        Boolean collapsible,
                        String appearance,
                        String itemAppearance,
                        List<String> options,
                        Integer minItems,
                        String addButtonLabel,
                        String entryTitle,
                        String titleSourceFieldId,
                        List<FormBlockResponse> fields,
                        LayoutResponse layout,
                        OptionSourceResponse optionSource) {
        }

        public record LayoutResponse(
                        String width,
                        Integer optionColumns,
                        Boolean optionFitContent) {
        }

        public record OptionSourceResponse(
                        String blockId,
                        String fieldId) {
        }
}
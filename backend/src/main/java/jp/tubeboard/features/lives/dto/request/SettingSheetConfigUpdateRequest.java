package jp.tubeboard.features.lives.dto.request;

import java.util.List;

public record SettingSheetConfigUpdateRequest(
                String title,
                String description,
                String submitButtonLabel,
                Boolean publicSubmissionEnabled,
                String recordLabelFieldId,
                List<FormBlockRequest> blocks) {

        public record FormBlockRequest(
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
                        List<FormBlockRequest> fields,
                        LayoutRequest layout,
                        OptionSourceRequest optionSource) {
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
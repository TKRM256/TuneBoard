package jp.tubeboard.features.lives.dto.response;

import java.util.List;

public record SettingSheetConfigResponse(
                String title,
                String description,
                String submitButtonLabel,
                Boolean publicSubmissionEnabled,
                List<FormBlockResponse> blocks) {

        public record FormBlockResponse(
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
                        List<FormBlockResponse> fields,
                        LayoutResponse layout,
                        OptionSourceResponse optionSource,
                        String duplicateDetectionRole,
                        List<VariantResponse> variants) {

                /**
                 * 繰り返しグループの 1 項目が使うフィールド。フロントの getGroupItemFields と同じ規則で、
                 * 見つからない variantId（削除されたバリエーション等）は先頭のバリエーションとして扱う。
                 * 提出の検証・曲かぶり検出・PDF で必ずこれを使い、画面と解釈がずれないようにする。
                 */
                public List<FormBlockResponse> itemFields(String variantId) {
                        if (variants == null || variants.isEmpty()) {
                                return fields == null ? List.of() : fields;
                        }
                        VariantResponse variant = variants.stream()
                                        .filter(v -> v.id().equals(variantId))
                                        .findFirst()
                                        .orElse(variants.get(0));
                        return variant.fields() == null ? List.of() : variant.fields();
                }
        }

        public record VariantResponse(
                        String id,
                        String label,
                        List<FormBlockResponse> fields) {
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
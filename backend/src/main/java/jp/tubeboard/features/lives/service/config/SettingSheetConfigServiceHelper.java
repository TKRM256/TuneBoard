package jp.tubeboard.features.lives.service.config;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;

import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.FormBlockRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.LayoutRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest.OptionSourceRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.OptionSourceResponse;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import lombok.AllArgsConstructor;

@Component
@AllArgsConstructor
public class SettingSheetConfigServiceHelper {

        private final FormBuilderHelper formBuilderHelper;

        public List<FormBlockResponse> normalizeBlocks(List<FormBlockRequest> values,
                        SettingSheetConfigResponse defaultConfig) {
                if (values == null) {
                        return defaultConfig.blocks();
                }
                List<FormBlockResponse> normalizedBlocks = new ArrayList<>();
                for (FormBlockRequest block : values) {
                        normalizedBlocks.add(normalizeBlock(block, defaultConfig));
                }
                return List.copyOf(normalizedBlocks);
        }

        public FormBlockResponse normalizeBlock(FormBlockRequest block, SettingSheetConfigResponse defaultConfig) {
                String type = formBuilderHelper.normalizeBlockType(block.type());
                boolean valueBlock = SettingSheetConstants.VALUE_BLOCK_TYPES.contains(type);
                boolean sectionBlock = SettingSheetConstants.BLOCK_SECTION.equals(type);
                boolean repeatableGroup = SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(type);
                OptionSourceResponse optionSource = SettingSheetConstants.OPTION_BLOCK_TYPES.contains(type)
                                ? formBuilderHelper.normalizeOptionSource(block.optionSource())
                                : null;
                return new FormBlockResponse(
                                formBuilderHelper.safeTextOrDefault(block.id(), UUID.randomUUID().toString()),
                                type,
                                formBuilderHelper.safeTextOrDefault(block.label(),
                                                formBuilderHelper.defaultBlockLabel(type)),
                                formBuilderHelper.safeText(block.description()),
                                Boolean.TRUE.equals(block.hidden()),
                                Boolean.TRUE.equals(block.publicVisible()),
                                (valueBlock || repeatableGroup) && Boolean.TRUE.equals(block.required()),
                                repeatableGroup && Boolean.TRUE.equals(block.collapsible()),
                                formBuilderHelper.normalizeAppearance(block.appearance(),
                                                formBuilderHelper.defaultAppearance(type)),
                                repeatableGroup
                                                ? formBuilderHelper.normalizeAppearance(block.itemAppearance(),
                                                                SettingSheetConstants.APPEARANCE_OUTLINE)
                                                : SettingSheetConstants.APPEARANCE_PLAIN,
                                SettingSheetConstants.OPTION_BLOCK_TYPES.contains(type) && optionSource == null
                                                ? formBuilderHelper.normalizeOptions(block.options(), List.of("選択肢1"))
                                                : List.of(),
                                repeatableGroup ? Math.max(0, block.minItems() == null ? 0 : block.minItems()) : 0,
                                repeatableGroup ? formBuilderHelper.safeTextOrDefault(block.addButtonLabel(), "項目を追加")
                                                : "",
                                repeatableGroup ? formBuilderHelper.safeTextOrDefault(block.entryTitle(), "項目") : "",
                                repeatableGroup ? formBuilderHelper.safeText(block.titleSourceFieldId()) : "",
                                (repeatableGroup || sectionBlock) ? normalizeBlocks(block.fields(), defaultConfig)
                                                : List.of(),
                                formBuilderHelper.normalizeLayout(block.layout()),
                                optionSource);
        }

        public List<FormBlockRequest> mapToFormBlockRequests(List<FormBlockResponse> blocks) {
                if (blocks == null) {
                        return null;
                }
                return blocks.stream().map(block -> new FormBlockRequest(
                                block.id(),
                                block.type(),
                                block.label(),
                                block.description(),
                                block.hidden(),
                                block.publicVisible(),
                                block.required(),
                                block.collapsible(),
                                block.appearance(),
                                block.itemAppearance(),
                                block.options(),
                                block.minItems(),
                                block.addButtonLabel(),
                                block.entryTitle(),
                                block.titleSourceFieldId(),
                                mapToFormBlockRequests(block.fields()),
                                block.layout() == null ? null
                                                : new LayoutRequest(block.layout().width(),
                                                                block.layout().optionColumns(),
                                                                block.layout().optionFitContent()),
                                block.optionSource() == null ? null
                                                : new OptionSourceRequest(block.optionSource().blockId(),
                                                                block.optionSource().fieldId())))
                                .toList();
        }
}

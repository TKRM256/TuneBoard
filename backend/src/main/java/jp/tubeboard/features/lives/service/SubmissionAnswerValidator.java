package jp.tubeboard.features.lives.service;

import static jp.tubeboard.features.lives.service.AnswerMaps.emptyAnswer;
import static jp.tubeboard.features.lives.service.AnswerMaps.toAnswerMap;
import static jp.tubeboard.features.lives.service.AnswerMaps.toBlockMap;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.OptionSourceResponse;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.stageplot.StagePlotValues;

/**
 * 提出内容（または管理者入力）をフォーム設定に照らして検証し、項目ごとのエラーを集める。
 * フロントの validation.ts と同じ規則にする。
 */
final class SubmissionAnswerValidator {

    static final int SHORT_TEXT_MAX_LENGTH = 255;
    static final int LONG_TEXT_MAX_LENGTH = 5000;

    /**
     * @param enforceRequired 必須項目の未入力をエラーにするか（管理者入力は少しずつ埋めるので false）
     */
    record Context(List<FormBlockResponse> rootBlocks, List<FieldAnswerRequest> rootAnswers,
            Map<String, String> fieldErrors, boolean enforceRequired, StagePlotSettings stagePlot) {
    }

    private SubmissionAnswerValidator() {
    }

    static void validate(List<FormBlockResponse> blocks, List<FieldAnswerRequest> answers, String pathPrefix,
            Context ctx, boolean validateUnknownAnswers) {
        Map<String, FormBlockResponse> blockMap = toBlockMap(blocks);
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        if (validateUnknownAnswers) {
            for (String fieldId : answerMap.keySet()) {
                if (!blockMap.containsKey(fieldId)) {
                    ctx.fieldErrors().putIfAbsent(pathPrefix + fieldId, "無効な質問です。");
                }
            }
        }
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }
            FieldAnswerRequest answer = answerMap.getOrDefault(block.id(), emptyAnswer(block.id()));
            String key = pathPrefix + block.id();
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                validate(block.fields(), answers, pathPrefix, ctx, false);
                continue;
            }
            if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                validateGroup(block, answer, key, ctx);
                continue;
            }
            if (!answer.items().isEmpty()) {
                ctx.fieldErrors().putIfAbsent(key, block.label() + " の入力形式が不正です。");
                continue;
            }
            String error = validateValues(block, answer.values(), ctx);
            if (error != null) {
                ctx.fieldErrors().putIfAbsent(key, error);
            }
        }
    }

    private static void validateGroup(FormBlockResponse block, FieldAnswerRequest answer, String key, Context ctx) {
        int minimum = Math.max(Boolean.TRUE.equals(block.required()) ? 1 : 0,
                block.minItems() == null ? 0 : block.minItems());
        if (ctx.enforceRequired() && answer.items().size() < minimum) {
            ctx.fieldErrors().putIfAbsent(key + ".items", block.label() + " は少なくとも" + minimum + "件必要です。");
        }
        if (!answer.values().isEmpty()) {
            ctx.fieldErrors().putIfAbsent(key, block.label() + " の入力形式が不正です。");
        }
        for (int index = 0; index < answer.items().size(); index++) {
            GroupItemRequest item = answer.items().get(index);
            validate(block.itemFields(item.variantId()), item.answers(), key + ".items[" + index + "].answers.", ctx,
                    true);
        }
    }

    /** @return エラーがあれば利用者向けのメッセージ、無ければ null */
    private static String validateValues(FormBlockResponse block, List<String> values, Context ctx) {
        String type = block.type();
        boolean stagePlotDisabled = SettingSheetConstants.BLOCK_STAGE_PLOT.equals(type)
                && ctx.stagePlot().paletteOrEmpty().isEmpty();
        if (ctx.enforceRequired() && Boolean.TRUE.equals(block.required()) && values.isEmpty()
                && !stagePlotDisabled) {
            return block.label() + " は必須です。";
        }
        if (SettingSheetConstants.BLOCK_SONG.equals(type)) {
            if (values.size() > 2) {
                return block.label() + " の入力形式が不正です。";
            }
            return tooLong(block, values);
        }
        String tooLong = tooLong(block, values);
        if (tooLong != null) {
            return tooLong;
        }
        if (isSingleValue(type) && values.size() > 1) {
            return block.label() + " は1つだけ回答してください。";
        }
        if (values.isEmpty()) {
            return null;
        }
        if (SettingSheetConstants.BLOCK_BOOLEAN.equals(type)
                && values.stream().anyMatch(value -> !("true".equals(value) || "false".equals(value)))) {
            return block.label() + " の値が不正です。";
        }
        if (SettingSheetConstants.BLOCK_DURATION.equals(type) && !DurationFormat.isValid(values.get(0))) {
            return block.label() + " は「分:秒」の形（例: 3:45）で入力してください。";
        }
        if (SettingSheetConstants.BLOCK_STAGE_PLOT.equals(type)) {
            String problem = StagePlotValues.validate(values.get(0), ctx.stagePlot());
            return problem == null ? null : block.label() + ": " + problem;
        }
        if (SettingSheetConstants.OPTION_BLOCK_TYPES.contains(type)) {
            List<String> allowedOptions = resolveAllowedOptions(block, ctx);
            if (values.stream().anyMatch(value -> !allowedOptions.contains(value))) {
                return block.label() + " の選択肢が不正です。";
            }
        }
        return null;
    }

    private static boolean isSingleValue(String type) {
        return SettingSheetConstants.BLOCK_SHORT_TEXT.equals(type)
                || SettingSheetConstants.BLOCK_LONG_TEXT.equals(type)
                || SettingSheetConstants.BLOCK_SINGLE_SELECT.equals(type)
                || SettingSheetConstants.BLOCK_BOOLEAN.equals(type)
                || SettingSheetConstants.BLOCK_DURATION.equals(type)
                || SettingSheetConstants.BLOCK_STAGE_PLOT.equals(type);
    }

    /**
     * 自由入力欄の文字数上限。公開 API から巨大な値を保存されないようにする。
     * 選択肢系は管理者が決めた選択肢との一致で検証するので対象外。フロントの validation.ts と同じ値にする。
     */
    private static String tooLong(FormBlockResponse block, List<String> values) {
        int maxLength;
        if (SettingSheetConstants.BLOCK_LONG_TEXT.equals(block.type())) {
            maxLength = LONG_TEXT_MAX_LENGTH;
        } else if (SettingSheetConstants.BLOCK_SHORT_TEXT.equals(block.type())
                || SettingSheetConstants.BLOCK_SONG.equals(block.type())) {
            maxLength = SHORT_TEXT_MAX_LENGTH;
        } else {
            return null;
        }
        if (values.stream().noneMatch(value -> value.length() > maxLength)) {
            return null;
        }
        return block.label() + " は" + maxLength + "文字以内で入力してください。";
    }

    private static List<String> resolveAllowedOptions(FormBlockResponse block, Context ctx) {
        if (block.optionSource() == null) {
            return block.options();
        }
        return List.copyOf(new LinkedHashSet<>(
                collectReferencedValues(ctx.rootBlocks(), ctx.rootAnswers(), block.optionSource())));
    }

    private static List<String> collectReferencedValues(List<FormBlockResponse> blocks,
            List<FieldAnswerRequest> answers, OptionSourceResponse source) {
        LinkedHashSet<String> values = new LinkedHashSet<>();
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                values.addAll(collectReferencedValues(block.fields(), answers, source));
                continue;
            }
            if (!SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                continue;
            }
            FieldAnswerRequest answer = answerMap.getOrDefault(block.id(), emptyAnswer(block.id()));
            if (block.id().equals(source.blockId())) {
                for (GroupItemRequest item : answer.items()) {
                    FieldAnswerRequest target = toAnswerMap(item.answers()).get(source.fieldId());
                    if (target != null) {
                        target.values().stream().filter(value -> !value.isBlank()).forEach(values::add);
                    }
                }
            }
            for (GroupItemRequest item : answer.items()) {
                values.addAll(
                        collectReferencedValues(block.itemFields(item.variantId()), item.answers(), source));
            }
        }
        return List.copyOf(values);
    }
}

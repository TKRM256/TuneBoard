package jp.tubeboard.features.lives.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.OptionSourceResponse;

@Service
public class SettingSheetSubmissionService {

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    public PublicSettingSheetSubmissionRequest normalizeSubmissionRequest(PublicSettingSheetSubmissionRequest request) {
        return new PublicSettingSheetSubmissionRequest(
                request.answers() == null ? List.of()
                        : request.answers().stream().map(this::normalizeFieldAnswer).toList());
    }

    public void validateSubmission(PublicSettingSheetSubmissionRequest request, SettingSheetConfigResponse config) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        validateAnswers(config.blocks(), request.answers(), "answers.", config.blocks(), request.answers(), fieldErrors,
                true);
        if (!fieldErrors.isEmpty()) {
            throw new BadRequestException(fieldErrors.values().stream().findFirst().orElse("入力内容を確認してください。"),
                    fieldErrors);
        }
    }

    public String resolveSubmissionSummary(SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionRequest request,
            String fallback) {
        String fieldId = config.recordLabelFieldId();
        if (fieldId != null && !fieldId.isBlank()) {
            String value = findFirstValueByFieldId(config.blocks(), request.answers(), fieldId);
            if (!value.isBlank()) {
                return value;
            }
        }
        String firstAnswer = findFirstSubmittedValue(config.blocks(), request.answers());
        return firstAnswer.isBlank() ? fallback + " の回答" : firstAnswer;
    }

    public String writeSubmissionPayload(PublicSettingSheetSubmissionRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("セッティングシート送信内容の保存に失敗しました", ex);
        }
    }

    public PublicSettingSheetSubmissionRequest readSubmissionPayload(String payloadJson) {
        try {
            return normalizeSubmissionRequest(
                    objectMapper.readValue(payloadJson, PublicSettingSheetSubmissionRequest.class));
        } catch (JsonProcessingException ex) {
            return new PublicSettingSheetSubmissionRequest(List.of());
        }
    }

    public List<FieldAnswerResponse> mapFieldAnswers(List<FieldAnswerRequest> answers) {
        return answers.stream()
                .map(answer -> new FieldAnswerResponse(
                        answer.fieldId(),
                        answer.values(),
                        answer.items().stream().map(item -> new GroupItemResponse(mapFieldAnswers(item.answers())))
                                .toList()))
                .toList();
    }

    public PublicSettingSheetSubmissionRequest filterAnswersForSharedPublicView(
            PublicSettingSheetSubmissionRequest request,
            SettingSheetConfigResponse config) {
        return new PublicSettingSheetSubmissionRequest(
                filterAnswers(config.blocks(), request.answers()));
    }

    public String resolveSharedRecordLabel(SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionRequest sharedRequest) {
        String fieldId = safeText(config.recordLabelFieldId());
        if (!fieldId.isBlank() && isSharedVisibleField(config.blocks(), fieldId, true)) {
            String value = findFirstValueByFieldId(config.blocks(), sharedRequest.answers(), fieldId);
            if (!value.isBlank()) {
                return value;
            }
        }
        return findFirstSubmittedValue(config.blocks(), sharedRequest.answers());
    }

    private List<FieldAnswerRequest> filterAnswers(List<FormBlockResponse> blocks, List<FieldAnswerRequest> answers) {
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        List<FieldAnswerRequest> filtered = new java.util.ArrayList<>();

        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }

            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                filtered.addAll(filterAnswers(block.fields(), answers));
                continue;
            }

            if (!Boolean.TRUE.equals(block.publicVisible())) {
                continue;
            }

            FieldAnswerRequest answer = answerMap.getOrDefault(block.id(), emptyAnswer(block.id()));
            if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                List<GroupItemRequest> items = answer.items().stream()
                        .map(item -> new GroupItemRequest(filterAnswers(block.fields(), item.answers())))
                        .toList();
                filtered.add(new FieldAnswerRequest(block.id(), List.of(), items));
                continue;
            }

            filtered.add(new FieldAnswerRequest(block.id(), answer.values(), List.of()));
        }

        return List.copyOf(filtered);
    }

    private boolean isSharedVisibleField(List<FormBlockResponse> blocks, String fieldId, boolean ancestorsVisible) {
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }

            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                if (isSharedVisibleField(block.fields(), fieldId, ancestorsVisible)) {
                    return true;
                }
                continue;
            }

            boolean currentVisible = ancestorsVisible && Boolean.TRUE.equals(block.publicVisible());
            if (block.id().equals(fieldId)) {
                return currentVisible;
            }

            if ((SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type()))
                    && isSharedVisibleField(block.fields(), fieldId, currentVisible)) {
                return true;
            }
        }
        return false;
    }

    private void validateAnswers(List<FormBlockResponse> blocks,
            List<FieldAnswerRequest> answers,
            String pathPrefix,
            List<FormBlockResponse> rootBlocks,
            List<FieldAnswerRequest> rootAnswers,
            Map<String, String> fieldErrors,
            boolean validateUnknownAnswers) {
        Map<String, FormBlockResponse> blockMap = toBlockMap(blocks);
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        if (validateUnknownAnswers) {
            for (String fieldId : answerMap.keySet()) {
                if (!blockMap.containsKey(fieldId)) {
                    fieldErrors.putIfAbsent(pathPrefix + fieldId, "無効な質問です。");
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
                validateAnswers(block.fields(), answers, pathPrefix, rootBlocks, rootAnswers, fieldErrors, false);
                continue;
            }
            if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                int minimum = Math.max(Boolean.TRUE.equals(block.required()) ? 1 : 0,
                        block.minItems() == null ? 0 : block.minItems());
                if (answer.items().size() < minimum) {
                    fieldErrors.putIfAbsent(key + ".items", block.label() + " は少なくとも" + minimum + "件必要です。");
                }
                if (!answer.values().isEmpty()) {
                    fieldErrors.putIfAbsent(key, block.label() + " の入力形式が不正です。");
                }
                for (int index = 0; index < answer.items().size(); index++) {
                    validateAnswers(block.fields(), answer.items().get(index).answers(),
                            key + ".items[" + index + "].answers.",
                            rootBlocks, rootAnswers, fieldErrors, true);
                }
                continue;
            }
            if (!answer.items().isEmpty()) {
                fieldErrors.putIfAbsent(key, block.label() + " の入力形式が不正です。");
                continue;
            }
            List<String> values = answer.values();
            if (Boolean.TRUE.equals(block.required()) && values.isEmpty()) {
                fieldErrors.putIfAbsent(key, block.label() + " は必須です。");
                continue;
            }
            if ((SettingSheetConstants.BLOCK_SHORT_TEXT.equals(block.type())
                    || SettingSheetConstants.BLOCK_LONG_TEXT.equals(block.type())
                    || SettingSheetConstants.BLOCK_SINGLE_SELECT.equals(block.type())
                    || SettingSheetConstants.BLOCK_BOOLEAN.equals(block.type())) && values.size() > 1) {
                fieldErrors.putIfAbsent(key, block.label() + " は1つだけ回答してください。");
                continue;
            }
            if (SettingSheetConstants.BLOCK_BOOLEAN.equals(block.type())
                    && values.stream().anyMatch(value -> !("true".equals(value) || "false".equals(value)))) {
                fieldErrors.putIfAbsent(key, block.label() + " の値が不正です。");
                continue;
            }
            if (SettingSheetConstants.OPTION_BLOCK_TYPES.contains(block.type())) {
                List<String> allowedOptions = resolveAllowedOptions(block, rootBlocks, rootAnswers);
                if (values.stream().anyMatch(value -> !allowedOptions.contains(value))) {
                    fieldErrors.putIfAbsent(key, block.label() + " の選択肢が不正です。");
                }
            }
        }
    }

    private FieldAnswerRequest normalizeFieldAnswer(FieldAnswerRequest answer) {
        return new FieldAnswerRequest(
                safeText(answer.fieldId()),
                answer.values() == null ? List.of()
                        : answer.values().stream().map(this::safeText).filter(value -> !value.isBlank()).distinct()
                                .toList(),
                answer.items() == null ? List.of()
                        : answer.items().stream().map(item -> new GroupItemRequest(
                                item.answers() == null ? List.of()
                                        : item.answers().stream().map(this::normalizeFieldAnswer).toList()))
                                .toList());
    }

    private Map<String, FormBlockResponse> toBlockMap(List<FormBlockResponse> blocks) {
        Map<String, FormBlockResponse> blockMap = new LinkedHashMap<>();
        for (FormBlockResponse block : blocks) {
            blockMap.put(block.id(), block);
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                blockMap.putAll(toBlockMap(block.fields()));
            }
        }
        return blockMap;
    }

    private Map<String, FieldAnswerRequest> toAnswerMap(List<FieldAnswerRequest> answers) {
        Map<String, FieldAnswerRequest> answerMap = new LinkedHashMap<>();
        for (FieldAnswerRequest answer : answers) {
            if (!answer.fieldId().isBlank()) {
                answerMap.put(answer.fieldId(), answer);
            }
        }
        return answerMap;
    }

    private FieldAnswerRequest emptyAnswer(String fieldId) {
        return new FieldAnswerRequest(fieldId, List.of(), List.of());
    }

    private List<String> resolveAllowedOptions(FormBlockResponse block,
            List<FormBlockResponse> rootBlocks,
            List<FieldAnswerRequest> rootAnswers) {
        if (block.optionSource() == null) {
            return block.options();
        }
        return List.copyOf(new LinkedHashSet<>(collectReferencedValues(rootBlocks, rootAnswers, block.optionSource())));
    }

    private List<String> collectReferencedValues(List<FormBlockResponse> blocks,
            List<FieldAnswerRequest> answers,
            OptionSourceResponse source) {
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
                values.addAll(collectReferencedValues(block.fields(), item.answers(), source));
            }
        }
        return List.copyOf(values);
    }

    private String findFirstValueByFieldId(List<FormBlockResponse> blocks, List<FieldAnswerRequest> answers,
            String fieldId) {
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }
            FieldAnswerRequest answer = answerMap.getOrDefault(block.id(), emptyAnswer(block.id()));
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                String nested = findFirstValueByFieldId(block.fields(), answers, fieldId);
                if (!nested.isBlank()) {
                    return nested;
                }
                continue;
            }
            if (block.id().equals(fieldId)) {
                for (String value : answer.values()) {
                    if (!value.isBlank()) {
                        return value;
                    }
                }
            }
            if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                for (GroupItemRequest item : answer.items()) {
                    String nested = findFirstValueByFieldId(block.fields(), item.answers(), fieldId);
                    if (!nested.isBlank()) {
                        return nested;
                    }
                }
            }
        }
        return "";
    }

    private String findFirstSubmittedValue(List<FormBlockResponse> blocks, List<FieldAnswerRequest> answers) {
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }
            FieldAnswerRequest answer = answerMap.getOrDefault(block.id(), emptyAnswer(block.id()));
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                String nested = findFirstSubmittedValue(block.fields(), answers);
                if (!nested.isBlank()) {
                    return nested;
                }
                continue;
            }
            for (String value : answer.values()) {
                if (!value.isBlank()) {
                    return value;
                }
            }
            if (SettingSheetConstants.BLOCK_REPEATABLE_GROUP.equals(block.type())) {
                for (GroupItemRequest item : answer.items()) {
                    String nested = findFirstSubmittedValue(block.fields(), item.answers());
                    if (!nested.isBlank()) {
                        return nested;
                    }
                }
            }
        }
        return "";
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }
}
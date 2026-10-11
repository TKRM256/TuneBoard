package jp.tubeboard.features.lives.service;

import static jp.tubeboard.features.lives.service.AnswerMaps.emptyAnswer;
import static jp.tubeboard.features.lives.service.AnswerMaps.toAnswerMap;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;

@Service
public class SettingSheetSubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SettingSheetSubmissionService.class);
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();
    private static final int RECORD_LABEL_MAX_LENGTH = 255;

    public PublicSettingSheetSubmissionRequest normalizeSubmissionRequest(PublicSettingSheetSubmissionRequest request) {
        return new PublicSettingSheetSubmissionRequest(
                normalizeFieldAnswers(request.answers()),
                request.itunesLinks() == null ? null
                        : request.itunesLinks().stream().filter(Objects::nonNull).toList());
    }

    private List<FieldAnswerRequest> normalizeFieldAnswers(List<FieldAnswerRequest> answers) {
        return answers == null ? List.of()
                : answers.stream().filter(Objects::nonNull).map(this::normalizeFieldAnswer).toList();
    }

    /** 出演者の提出の検証。config には管理者入力の項目を除いた設定を渡す。 */
    public void validateSubmission(PublicSettingSheetSubmissionRequest request, SettingSheetConfigResponse config,
            StagePlotSettings stagePlot) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        SubmissionAnswerValidator.validate(config.blocks(), request.answers(), "answers.",
                new SubmissionAnswerValidator.Context(config.blocks(), request.answers(), fieldErrors, true, stagePlot),
                true);
        throwIfInvalid(fieldErrors);
    }

    /** 管理者入力の検証。必須は問わない（少しずつ埋めるため）。blocks は管理者入力のブロックだけ。 */
    public void validateAdminAnswers(List<FormBlockResponse> blocks, List<FieldAnswerRequest> answers,
            StagePlotSettings stagePlot) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        SubmissionAnswerValidator.validate(blocks, answers, "answers.",
                new SubmissionAnswerValidator.Context(blocks, answers, fieldErrors, false, stagePlot), true);
        throwIfInvalid(fieldErrors);
    }

    private static void throwIfInvalid(Map<String, String> fieldErrors) {
        if (!fieldErrors.isEmpty()) {
            throw new BadRequestException(fieldErrors.values().stream().findFirst().orElse("入力内容を確認してください。"),
                    fieldErrors);
        }
    }

    public String resolveSubmissionSummary(SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionRequest request,
            String fallback) {
        String firstAnswer = findFirstSubmittedValue(config.blocks(), request.answers());
        String summary = firstAnswer.isBlank() ? fallback + " の回答" : firstAnswer;
        // record_label は VARCHAR(255)。先頭の回答が長文欄でも保存できるよう切り詰める
        if (summary.length() <= RECORD_LABEL_MAX_LENGTH) {
            return summary;
        }
        // 絵文字などのサロゲートペアを途中で切らない
        int end = Character.isHighSurrogate(summary.charAt(RECORD_LABEL_MAX_LENGTH - 1))
                ? RECORD_LABEL_MAX_LENGTH - 1
                : RECORD_LABEL_MAX_LENGTH;
        return summary.substring(0, end);
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
            log.warn("提出データのデシリアライズに失敗、空データとして処理: {}", ex.getMessage());
            return new PublicSettingSheetSubmissionRequest(List.of(), null);
        }
    }

    public List<FieldAnswerResponse> mapFieldAnswers(List<FieldAnswerRequest> answers) {
        return answers.stream()
                .map(answer -> new FieldAnswerResponse(
                        answer.fieldId(),
                        answer.values(),
                        answer.items().stream()
                                .map(item -> new GroupItemResponse(item.variantId(),
                                        mapFieldAnswers(item.answers())))
                                .toList()))
                .toList();
    }

    public PublicSettingSheetSubmissionRequest filterAnswersForSharedPublicView(
            PublicSettingSheetSubmissionRequest request,
            SettingSheetConfigResponse config) {
        return new PublicSettingSheetSubmissionRequest(
                filterAnswers(config.blocks(), request.answers()), null);
    }

    public String resolveSharedRecordLabel(SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionRequest sharedRequest) {
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
                        .map(item -> new GroupItemRequest(item.variantId(),
                                filterAnswers(block.itemFields(item.variantId()), item.answers())))
                        .toList();
                filtered.add(new FieldAnswerRequest(block.id(), List.of(), items));
                continue;
            }

            filtered.add(new FieldAnswerRequest(block.id(), answer.values(), List.of()));
        }

        return List.copyOf(filtered);
    }

    private FieldAnswerRequest normalizeFieldAnswer(FieldAnswerRequest answer) {
        return new FieldAnswerRequest(
                safeText(answer.fieldId()),
                answer.values() == null ? List.of()
                        : answer.values().stream().map(this::safeText).filter(value -> !value.isBlank()).distinct()
                                .toList(),
                answer.items() == null ? List.of()
                        : answer.items().stream().filter(Objects::nonNull).map(item -> new GroupItemRequest(
                                safeText(item.variantId()),
                                normalizeFieldAnswers(item.answers())))
                                .toList());
    }

    private String findFirstSubmittedValue(List<FormBlockResponse> blocks, List<FieldAnswerRequest> answers) {
        Map<String, FieldAnswerRequest> answerMap = toAnswerMap(answers);
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) {
                continue;
            }
            if (SettingSheetConstants.BLOCK_STAGE_PLOT.equals(block.type())) {
                // 配置図の値は JSON なので、一覧に出す名前には使わない
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
                    String nested = findFirstSubmittedValue(block.itemFields(item.variantId()), item.answers());
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
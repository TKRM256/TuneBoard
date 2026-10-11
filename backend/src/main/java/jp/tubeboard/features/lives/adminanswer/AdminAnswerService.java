package jp.tubeboard.features.lives.adminanswer;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.adminanswer.AdminAnswerDtos.AdminAnswersResponse;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.AdminOnlyBlocks;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.crud.LiveServiceHelper;
import jp.tubeboard.features.lives.stageplot.StagePlotSettingsReader;
import lombok.RequiredArgsConstructor;

/** 管理者だけが入力する項目（出順など）の回答の読み書き。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnswerService {

    private static final TypeReference<List<FieldAnswerRequest>> ANSWERS = new TypeReference<>() {
    };

    private final SettingSheetAdminAnswersRepository repository;
    private final LiveServiceHelper helper;
    private final SettingSheetConfigService settingSheetConfigService;
    private final SettingSheetSubmissionService settingSheetSubmissionService;
    private final StagePlotSettingsReader stagePlotSettingsReader;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    /** 送られた項目だけを置き換える（一覧の表から 1 マスずつ保存できるように）。値が空なら消す。 */
    @Transactional
    public AdminAnswersResponse update(UUID liveId, UUID submissionId, List<FieldAnswerRequest> requested) {
        SettingSheetSubmission submission = helper.findAdminSubmission(liveId, submissionId);
        Live live = submission.getLive();
        List<FormBlockResponse> adminBlocks = AdminOnlyBlocks.collect(
                settingSheetConfigService.readSettingSheetConfig(live));
        List<FieldAnswerRequest> normalized = settingSheetSubmissionService
                .normalizeSubmissionRequest(new PublicSettingSheetSubmissionRequest(requested, null))
                .answers();
        settingSheetSubmissionService.validateAdminAnswers(adminBlocks, normalized,
                stagePlotSettingsReader.read(live));

        Set<String> adminFieldIds = adminBlocks.stream().map(FormBlockResponse::id).collect(Collectors.toSet());
        SettingSheetAdminAnswers row = repository.findForUpdateBySubmissionId(submission.getId())
                .orElseGet(() -> SettingSheetAdminAnswers.builder().submissionId(submission.getId()).build());
        Map<String, FieldAnswerRequest> merged = new LinkedHashMap<>();
        for (FieldAnswerRequest answer : parse(row.getAnswersJson())) {
            if (adminFieldIds.contains(answer.fieldId())) {
                merged.put(answer.fieldId(), answer);
            }
        }
        for (FieldAnswerRequest answer : normalized) {
            if (answer.values().isEmpty()) {
                merged.remove(answer.fieldId());
            } else {
                merged.put(answer.fieldId(), new FieldAnswerRequest(answer.fieldId(), answer.values(), List.of()));
            }
        }
        row.setAnswersJson(write(new ArrayList<>(merged.values())));
        try {
            repository.saveAndFlush(row);
        } catch (DataIntegrityViolationException ex) {
            // 同じ提出への最初の保存がほぼ同時に 2 つ来た場合
            throw new ObjectOptimisticLockingFailureException(SettingSheetAdminAnswers.class, submission.getId());
        }
        return new AdminAnswersResponse(settingSheetSubmissionService.mapFieldAnswers(List.copyOf(merged.values())));
    }

    public Map<UUID, List<FieldAnswerRequest>> readAll(Collection<UUID> submissionIds) {
        Map<UUID, List<FieldAnswerRequest>> out = new HashMap<>();
        if (submissionIds.isEmpty()) {
            return out;
        }
        for (SettingSheetAdminAnswers row : repository.findAllBySubmissionIdIn(submissionIds)) {
            out.put(row.getSubmissionId(), parse(row.getAnswersJson()));
        }
        return out;
    }

    /**
     * 出演者の回答に管理者入力の回答を重ねる。今も管理者入力の項目だけを対象にし、
     * 同じ項目に出演者の古い回答（管理者入力に切り替える前の値）があれば管理者入力を優先する。
     */
    public List<FieldAnswerResponse> merge(List<FieldAnswerResponse> answers, List<FieldAnswerRequest> adminAnswers,
            SettingSheetConfigResponse config) {
        if (adminAnswers == null || adminAnswers.isEmpty()) {
            return answers;
        }
        Set<String> adminFieldIds = AdminOnlyBlocks.collect(config).stream()
                .map(FormBlockResponse::id)
                .collect(Collectors.toSet());
        Map<String, FieldAnswerResponse> merged = new LinkedHashMap<>();
        for (FieldAnswerResponse answer : answers) {
            merged.put(answer.fieldId(), answer);
        }
        for (FieldAnswerResponse answer : settingSheetSubmissionService.mapFieldAnswers(adminAnswers)) {
            if (adminFieldIds.contains(answer.fieldId())) {
                merged.put(answer.fieldId(), answer);
            }
        }
        return List.copyOf(merged.values());
    }

    private List<FieldAnswerRequest> parse(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            List<FieldAnswerRequest> parsed = objectMapper.readValue(json, ANSWERS);
            return settingSheetSubmissionService
                    .normalizeSubmissionRequest(new PublicSettingSheetSubmissionRequest(parsed, null))
                    .answers();
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private String write(List<FieldAnswerRequest> answers) {
        try {
            return objectMapper.writeValueAsString(answers);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("管理者入力の保存に失敗しました", ex);
        }
    }
}

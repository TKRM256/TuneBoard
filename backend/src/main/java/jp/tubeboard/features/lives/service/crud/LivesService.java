package jp.tubeboard.features.lives.service.crud;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.tenants.model.Tenants;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional(readOnly = true)
public class LivesService implements ILivesService {

        private final LiveRepository liveRepository;
        private final UserService userService;
        private final SettingSheetConfigService settingSheetConfigService;
        private final SettingSheetSubmissionService settingSheetSubmissionService;
        private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;

        private final LiveServiceHelper helper;

        @Override
        @Transactional
        public LiveResponse create(LiveCreateRequest request) {
                User currentUser = userService.getCurrentUser();
                Tenants tenant = helper.findTenant(request.tenantId(), currentUser.getId());

                Live live = Live.builder()
                                .tenant(tenant)
                                .publicToken(UUID.randomUUID().toString())
                                .name(request.name())
                                .date(request.date())
                                .location(request.location())
                                .deadlineAt(request.deadlineAt())
                                .status(helper.resolveStatus(request.status()))
                                .settingsJson(settingSheetConfigService.writeSettingSheetConfig(
                                                settingSheetConfigService.defaultSettingSheetConfig()))
                                .build();

                return helper.toResponse(liveRepository.save(live));
        }

        @Override
        public List<LiveResponse> list() {
                User currentUser = userService.getCurrentUser();

                return liveRepository
                                .findAllByTenantUserIdAndDeletedAtIsNullOrderByDateAscCreatedAtDesc(currentUser.getId())
                                .stream()
                                .map(helper::toResponse)
                                .toList();
        }

        @Override
        public List<LiveResponse> listByTenant(UUID tenantId) {
                User currentUser = userService.getCurrentUser();
                helper.findTenant(tenantId, currentUser.getId());

                return liveRepository
                                .findAllByTenantIdAndTenantUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(tenantId,
                                                currentUser.getId())
                                .stream()
                                .map(helper::toResponse)
                                .toList();
        }

        @Override
        public LiveResponse get(UUID id) {
                return helper.toResponse(helper.findOwnedLive(id));
        }

        @Override
        @Transactional
        public LiveResponse update(LiveUpdateRequest request) {
                Live live = helper.findOwnedLive(request.id());

                live.setName(request.name());
                live.setDate(request.date());
                live.setLocation(request.location());
                live.setDeadlineAt(request.deadlineAt());
                live.setStatus(helper.resolveStatus(request.status()));

                if (live.getSettingsJson() == null || live.getSettingsJson().isBlank()) {
                        live.setSettingsJson(settingSheetConfigService.writeSettingSheetConfig(
                                        settingSheetConfigService.defaultSettingSheetConfig()));
                }

                return helper.toResponse(liveRepository.save(live));
        }

        @Override
        @Transactional
        public void delete(UUID id) {
                Live live = helper.findOwnedLive(id);

                live.markDeleted();
                liveRepository.save(live);
        }

        @Override
        public PublicLiveResponse findPublicLive(String publicToken) {
                Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));

                return new PublicLiveResponse(
                                live.getName(),
                                live.getDate(),
                                live.getLocation(),
                                live.getDeadlineAt(),
                                live.getStatus(),
                                settingSheetConfigService.readSettingSheetConfig(live));
        }

        @Override
        public SettingSheetConfigResponse getDefaultSettingSheetConfig() {
                return settingSheetConfigService.defaultSettingSheetConfig();
        }

        @Override
        public SettingSheetConfigResponse getSettingSheetConfig(UUID id) {
                return settingSheetConfigService.readSettingSheetConfig(helper.findOwnedLive(id));
        }

        @Override
        @Transactional
        public SettingSheetConfigResponse updateSettingSheetConfig(UUID id, SettingSheetConfigUpdateRequest request) {
                Live live = helper.findOwnedLive(id);

                SettingSheetConfigResponse normalized = settingSheetConfigService.normalizeSettingSheetConfig(request);
                live.setSettingsJson(settingSheetConfigService.writeSettingSheetConfig(normalized));
                liveRepository.save(live);
                return normalized;
        }

        @Override
        @Transactional
        public SettingSheetSubmissionResponse submitPublicSettingSheet(String publicToken,
                        PublicSettingSheetSubmissionRequest request) {
                Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));
                return helper.saveSubmission(live, request, null);
        }

        @Override
        public List<SettingSheetSubmissionResponse> listOwnedSettingSheetSubmissions(UUID liveId) {
                User currentUser = userService.getCurrentUser();
                helper.findOwnedLive(liveId);

                return settingSheetSubmissionRepository
                                .findAllByLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNullOrderByCreatedAtDesc(liveId,
                                                currentUser.getId())
                                .stream()
                                .map(helper::toSubmissionResponse)
                                .toList();
        }

        @Override
        public PublicSettingSheetSubmissionDetailResponse getOwnedSettingSheetSubmission(UUID liveId,
                        UUID submissionId) {
                SettingSheetSubmission submission = helper.findOwnedSubmission(liveId, submissionId);
                PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService.readSubmissionPayload(
                                submission.getPayloadJson());
                return new PublicSettingSheetSubmissionDetailResponse(
                                submission.getId(),
                                submission.getRecordLabel(),
                                submission.getSubmissionStatus(),
                                submission.getCreatedAt(),
                                settingSheetSubmissionService.mapFieldAnswers(payload.answers()));
        }

        @Override
        public List<PublicSettingSheetSubmissionDetailResponse> listOwnedSettingSheetSubmissionDetails(UUID liveId) {
                User currentUser = userService.getCurrentUser();
                helper.findOwnedLive(liveId);

                return settingSheetSubmissionRepository
                                .findAllByLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNullOrderByCreatedAtDesc(liveId,
                                                currentUser.getId())
                                .stream()
                                .map(submission -> {
                                        PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService
                                                        .readSubmissionPayload(submission.getPayloadJson());
                                        return new PublicSettingSheetSubmissionDetailResponse(
                                                        submission.getId(),
                                                        submission.getRecordLabel(),
                                                        submission.getSubmissionStatus(),
                                                        submission.getCreatedAt(),
                                                        settingSheetSubmissionService
                                                                        .mapFieldAnswers(payload.answers()));
                                })
                                .toList();
        }

        @Override
        public PublicSettingSheetSubmissionDetailResponse getPublicSettingSheetSubmission(String publicToken,
                        UUID submissionId) {
                SettingSheetSubmission submission = helper.findPublicSubmission(publicToken, submissionId);
                PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService.readSubmissionPayload(
                                submission.getPayloadJson());
                return new PublicSettingSheetSubmissionDetailResponse(
                                submission.getId(),
                                submission.getRecordLabel(),
                                submission.getSubmissionStatus(),
                                submission.getCreatedAt(),
                                settingSheetSubmissionService.mapFieldAnswers(payload.answers()));
        }

        @Override
        public PublicSettingSheetSubmissionDetailResponse getPublicSharedSettingSheetSubmission(String publicToken,
                        UUID submissionId) {
                SettingSheetSubmission submission = helper.findPublicSubmission(publicToken, submissionId);
                SettingSheetConfigResponse config = settingSheetConfigService
                                .readSettingSheetConfig(submission.getLive());
                if (!Boolean.TRUE.equals(config.publicSubmissionEnabled())) {
                        throw new LivesNotFoundException("共有提出データは公開されていません");
                }
                PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService.readSubmissionPayload(
                                submission.getPayloadJson());
                PublicSettingSheetSubmissionRequest sharedPayload = settingSheetSubmissionService
                                .filterAnswersForSharedPublicView(
                                                payload,
                                                config);

                return new PublicSettingSheetSubmissionDetailResponse(
                                submission.getId(),
                                settingSheetSubmissionService.resolveSharedRecordLabel(config, sharedPayload),
                                submission.getSubmissionStatus(),
                                submission.getCreatedAt(),
                                settingSheetSubmissionService.mapFieldAnswers(sharedPayload.answers()));
        }

        @Override
        public List<PublicSettingSheetSubmissionDetailResponse> listPublicSharedSettingSheetSubmissions(
                        String publicToken) {
                Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));

                SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);
                if (!Boolean.TRUE.equals(config.publicSubmissionEnabled())) {
                        throw new LivesNotFoundException("共有提出データは公開されていません");
                }

                return settingSheetSubmissionRepository
                                .findAllByLivePublicTokenAndLiveDeletedAtIsNullOrderByCreatedAtDesc(publicToken)
                                .stream()
                                .map(submission -> {
                                        PublicSettingSheetSubmissionRequest payload = settingSheetSubmissionService
                                                        .readSubmissionPayload(submission.getPayloadJson());
                                        PublicSettingSheetSubmissionRequest sharedPayload = settingSheetSubmissionService
                                                        .filterAnswersForSharedPublicView(payload, config);
                                        return new PublicSettingSheetSubmissionDetailResponse(
                                                        submission.getId(),
                                                        settingSheetSubmissionService.resolveSharedRecordLabel(config,
                                                                        sharedPayload),
                                                        submission.getSubmissionStatus(),
                                                        submission.getCreatedAt(),
                                                        settingSheetSubmissionService
                                                                        .mapFieldAnswers(sharedPayload.answers()));
                                })
                                .toList();
        }

        @Override
        @Transactional
        public SettingSheetSubmissionResponse updatePublicSettingSheetSubmission(String publicToken,
                        UUID submissionId,
                        PublicSettingSheetSubmissionRequest request) {
                SettingSheetSubmission submission = helper.findPublicSubmission(publicToken, submissionId);
                return helper.saveSubmission(submission.getLive(), request, submission);
        }
}

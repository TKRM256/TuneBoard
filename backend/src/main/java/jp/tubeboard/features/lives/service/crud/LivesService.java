package jp.tubeboard.features.lives.service.crud;

import java.time.LocalDateTime;
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
import jp.tubeboard.features.lives.dto.request.PublicSongDuplicateCheckRequest;
import jp.tubeboard.features.lives.dto.response.PublicSongDuplicateCheckResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.duplicate.SongDuplicateDetectionService;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;
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
        private final SongDuplicateDetectionService songDuplicateDetectionService;
        private final UserTenantRepository userTenantRepository;

        private final LiveServiceHelper helper;

        @Override
        @Transactional
        public LiveResponse create(LiveCreateRequest request) {
                User currentUser = userService.getCurrentUser();
                Tenants tenant = helper.findAdminTenant(request.tenantId(), currentUser.getId());

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
                                .findAllAccessibleByUserId(currentUser.getId())
                                .stream()
                                .map(helper::toResponse)
                                .toList();
        }

        @Override
        public List<LiveResponse> listByTenant(UUID tenantId) {
                User currentUser = userService.getCurrentUser();
                helper.findTenant(tenantId, currentUser.getId());

                return liveRepository
                                .findAllByTenantIdAndAccessibleByUserId(tenantId,
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
                Live live = helper.findAdminLive(request.id());

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
                Live live = helper.findAdminLive(id);

                live.markDeleted();
                liveRepository.save(live);
        }

        @Override
        public List<LiveResponse> listTrashedByTenant(UUID tenantId) {
                User currentUser = userService.getCurrentUser();
                helper.findTenant(tenantId, currentUser.getId());
                LocalDateTime cutoff = LocalDateTime.now().minusDays(30);

                return liveRepository
                                .findAllTrashedByTenantIdAndAccessibleByUserId(tenantId, currentUser.getId(), cutoff)
                                .stream()
                                .map(helper::toResponse)
                                .toList();
        }

        @Override
        @Transactional
        public void restoreLive(UUID id) {
                User currentUser = userService.getCurrentUser();
                Live live = liveRepository.findTrashedByIdAndAccessibleByUserId(id, currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));
                userTenantRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(
                                live.getTenant().getId(), currentUser.getId())
                                .filter(ut -> ut.getRole().isAdminLevel())
                                .orElseThrow(() -> new TenantsNotFoundException("管理者権限がありません"));

                live.restore();
                liveRepository.save(live);
        }

        @Override
        @Transactional
        public void deleteSubmission(UUID liveId, UUID submissionId) {
                SettingSheetSubmission submission = helper.findOwnedSubmission(liveId, submissionId);
                submission.markDeleted();
                settingSheetSubmissionRepository.save(submission);
        }

        @Override
        @Transactional
        public void restoreSubmission(UUID liveId, UUID submissionId) {
                User currentUser = userService.getCurrentUser();
                SettingSheetSubmission submission = settingSheetSubmissionRepository
                                .findTrashedByIdAndLiveIdAndAccessibleByUserId(submissionId, liveId,
                                                currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
                submission.restore();
                settingSheetSubmissionRepository.save(submission);
        }

        @Override
        @Transactional
        public void purgeLive(UUID id) {
                User currentUser = userService.getCurrentUser();
                Live live = liveRepository.findTrashedByIdAndAccessibleByUserId(id, currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));
                userTenantRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(
                                live.getTenant().getId(), currentUser.getId())
                                .filter(ut -> ut.getRole().isAdminLevel())
                                .orElseThrow(() -> new TenantsNotFoundException("管理者権限がありません"));

                settingSheetSubmissionRepository.deleteAllByLiveId(live.getId());
                liveRepository.delete(live);
        }

        @Override
        @Transactional
        public void purgeSubmission(UUID liveId, UUID submissionId) {
                User currentUser = userService.getCurrentUser();
                SettingSheetSubmission submission = settingSheetSubmissionRepository
                                .findTrashedByIdAndLiveIdAndAccessibleByUserId(submissionId, liveId,
                                                currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
                settingSheetSubmissionRepository.delete(submission);
        }

        @Override
        public List<SettingSheetSubmissionResponse> listTrashedSubmissions(UUID liveId) {
                User currentUser = userService.getCurrentUser();
                helper.findOwnedLive(liveId);
                LocalDateTime cutoff = LocalDateTime.now().minusDays(30);

                return settingSheetSubmissionRepository
                                .findAllTrashedByLiveIdAndAccessibleByUserId(liveId, currentUser.getId(), cutoff)
                                .stream()
                                .map(helper::toSubmissionResponse)
                                .toList();
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
                Live live = helper.findAdminLive(id);

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
                SettingSheetSubmissionResponse response = helper.saveSubmission(live, request, null);
                helper.triggerDuplicateDetection(live.getId());
                return response;
        }

        @Override
        public List<SettingSheetSubmissionResponse> listOwnedSettingSheetSubmissions(UUID liveId) {
                User currentUser = userService.getCurrentUser();
                helper.findOwnedLive(liveId);

                return settingSheetSubmissionRepository
                                .findAllByLiveIdAndAccessibleByUserId(liveId,
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
                                settingSheetSubmissionService.mapFieldAnswers(payload.answers()),
                                helper.mapItunesLinks(submission.getId()));
        }

        @Override
        public List<PublicSettingSheetSubmissionDetailResponse> listOwnedSettingSheetSubmissionDetails(UUID liveId) {
                User currentUser = userService.getCurrentUser();
                helper.findOwnedLive(liveId);

                return settingSheetSubmissionRepository
                                .findAllByLiveIdAndAccessibleByUserId(liveId,
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
                                                                        .mapFieldAnswers(payload.answers()),
                                                        List.of());
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
                                settingSheetSubmissionService.mapFieldAnswers(payload.answers()),
                                helper.mapItunesLinks(submission.getId()));
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
                                settingSheetSubmissionService.mapFieldAnswers(sharedPayload.answers()),
                                List.of());
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
                                .findAllByLivePublicTokenAndLiveDeletedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(
                                                publicToken)
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
                                                                        .mapFieldAnswers(sharedPayload.answers()),
                                                        List.of());
                                })
                                .toList();
        }

        @Override
        @Transactional
        public SettingSheetSubmissionResponse updatePublicSettingSheetSubmission(String publicToken,
                        UUID submissionId,
                        PublicSettingSheetSubmissionRequest request) {
                SettingSheetSubmission submission = helper.findPublicSubmission(publicToken, submissionId);
                SettingSheetSubmissionResponse response = helper.saveSubmission(submission.getLive(), request,
                                submission);
                helper.triggerDuplicateDetection(submission.getLive().getId());
                return response;
        }

        @Override
        @Transactional
        public SongDuplicateResponse detectSongDuplicates(UUID liveId) {
                helper.findOwnedLive(liveId);
                return songDuplicateDetectionService.getCachedResult(liveId)
                                .orElseGet(() -> songDuplicateDetectionService.computeAndStoreSync(liveId));
        }

        @Override
        @Transactional
        public SongDuplicateResponse refreshSongDuplicates(UUID liveId) {
                helper.findAdminLive(liveId);
                return songDuplicateDetectionService.forceComputeAndStoreSync(liveId);
        }

        @Override
        @Transactional
        public SongDuplicateResponse toggleDismissSongDuplicate(UUID liveId, String normalizedTitle) {
                helper.findAdminLive(liveId);
                return songDuplicateDetectionService.toggleDismiss(liveId, normalizedTitle);
        }

        @Override
        @Transactional(readOnly = true)
        public PublicSongDuplicateCheckResponse checkPublicSongDuplicate(String publicToken,
                        PublicSongDuplicateCheckRequest request, UUID excludeSubmissionId) {
                Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));
                return songDuplicateDetectionService.checkSongDuplicate(live, request, excludeSubmissionId);
        }
}

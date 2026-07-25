package jp.tubeboard.features.lives.service.crud;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.model.ItunesTrackLink;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.repository.ItunesTrackLinkRepository;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;
import lombok.AllArgsConstructor;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.duplicate.SongDuplicateDetectionService;

@Component
@AllArgsConstructor
public class LiveServiceHelper {
        private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
        private final ItunesTrackLinkRepository itunesTrackLinkRepository;
        private final TenantsRepository tenantsRepository;
        private final UserService userService;
        private final LiveRepository liveRepository;
        private final SettingSheetConfigService settingSheetConfigService;
        private final SettingSheetSubmissionService settingSheetSubmissionService;
        private final SongDuplicateDetectionService songDuplicateDetectionService;
        private final UserTenantRepository userTenantRepository;

        public Tenants findTenant(UUID tenantId, Long userId) {
                return tenantsRepository.findByIdAndAccessibleByUserId(tenantId, userId)
                                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));
        }

        public Tenants findAdminTenant(UUID tenantId, Long userId) {
                Tenants tenant = findTenant(tenantId, userId);
                requireAdminTenantAccess(tenantId, userId);
                return tenant;
        }

        public LiveStatus resolveStatus(LiveStatus status) {
                return status == null ? LiveStatus.DRAFT : status;
        }

        public Live findOwnedLive(UUID id) {
                User currentUser = userService.getCurrentUser();
                return liveRepository.findByIdAndAccessibleByUserId(id, currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));
        }

        public Live findAdminLive(UUID id) {
                User currentUser = userService.getCurrentUser();
                Live live = liveRepository.findByIdAndAccessibleByUserId(id, currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));
                requireAdminTenantAccess(live.getTenant().getId(), currentUser.getId());
                return live;
        }

        public Live findAdminTrashedLive(UUID id) {
                User currentUser = userService.getCurrentUser();
                Live live = liveRepository.findTrashedByIdAndAccessibleByUserId(id, currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("ライブが見つかりません"));
                requireAdminTenantAccess(live.getTenant().getId(), currentUser.getId());
                return live;
        }

        public SettingSheetSubmission findPublicSubmission(String publicToken, UUID submissionId) {
                return settingSheetSubmissionRepository
                                .findByIdAndLivePublicTokenAndLiveDeletedAtIsNullAndDeletedAtIsNull(submissionId,
                                                publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
        }

        public SettingSheetSubmission findOwnedSubmission(UUID liveId, UUID submissionId) {
                User currentUser = userService.getCurrentUser();
                return settingSheetSubmissionRepository
                                .findByIdAndLiveIdAndAccessibleByUserId(submissionId, liveId,
                                                currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
        }

        public SettingSheetSubmission findAdminSubmission(UUID liveId, UUID submissionId) {
                User currentUser = userService.getCurrentUser();
                findAdminLive(liveId);
                return settingSheetSubmissionRepository
                                .findByIdAndLiveIdAndAccessibleByUserId(submissionId, liveId,
                                                currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
        }

        public SettingSheetSubmission findAdminTrashedSubmission(UUID liveId, UUID submissionId) {
                User currentUser = userService.getCurrentUser();
                findAdminLive(liveId);
                return settingSheetSubmissionRepository
                                .findTrashedByIdAndLiveIdAndAccessibleByUserId(submissionId, liveId,
                                                currentUser.getId())
                                .orElseThrow(() -> new LivesNotFoundException("提出済みセッティングシートが見つかりません"));
        }

        public List<PublicSettingSheetSubmissionDetailResponse.ItunesLinkResponse> mapItunesLinks(UUID submissionId) {
                return itunesTrackLinkRepository.findAllBySubmissionId(submissionId).stream()
                                .map(link -> new PublicSettingSheetSubmissionDetailResponse.ItunesLinkResponse(
                                                link.getSongTitle(),
                                                link.getSongArtist(),
                                                link.getItunesTrackId(),
                                                link.getItunesTitle(),
                                                link.getItunesArtist(),
                                                link.getItunesAlbumArtUrl()))
                                .toList();
        }

        public SettingSheetSubmissionResponse saveSubmission(Live live,
                        PublicSettingSheetSubmissionRequest request,
                        SettingSheetSubmission submission) {
                assertAcceptingPublicSubmission(live);
                PublicSettingSheetSubmissionRequest normalizedRequest = settingSheetSubmissionService
                                .normalizeSubmissionRequest(request);
                SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);
                settingSheetSubmissionService.validateSubmission(normalizedRequest, config);
                String summary = settingSheetSubmissionService.resolveSubmissionSummary(config, normalizedRequest,
                                live.getName());

                SettingSheetSubmission target = submission == null
                                ? SettingSheetSubmission.builder().live(live).build()
                                : submission;
                target.setRecordLabel(summary);
                target.setSubmissionStatus(SettingSheetConstants.SUBMISSION_STATUS);
                target.setPayloadJson(settingSheetSubmissionService.writeSubmissionPayload(normalizedRequest));

                // レスポンスに更新後の version を載せるため、ここでフラッシュしてインクリメントを確定させる
                SettingSheetSubmission saved = settingSheetSubmissionRepository.saveAndFlush(target);
                saveItunesLinks(saved, request.itunesLinks());
                return toSubmissionResponse(saved);
        }

        public void triggerDuplicateDetection(UUID liveId) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                                songDuplicateDetectionService.computeAndStoreAsync(liveId);
                        }
                });
        }

        public LiveResponse toResponse(Live live) {
                return new LiveResponse(
                                live.getId(),
                                live.getTenant().getId(),
                                live.getTenant().getName(),
                                live.getPublicToken(),
                                live.getName(),
                                live.getDate(),
                                live.getLocation(),
                                live.getDeadlineAt(),
                                live.getStatus());
        }

        public SettingSheetSubmissionResponse toSubmissionResponse(SettingSheetSubmission submission) {
                return new SettingSheetSubmissionResponse(
                                submission.getId(),
                                submission.getRecordLabel(),
                                submission.getSubmissionStatus(),
                                submission.getCreatedAt(),
                                submission.getVersion());
        }

        private void saveItunesLinks(SettingSheetSubmission submission,
                        List<PublicSettingSheetSubmissionRequest.ItunesLinkRequest> links) {
                itunesTrackLinkRepository.deleteAllBySubmissionId(submission.getId());
                if (links == null || links.isEmpty()) {
                        return;
                }
                for (var link : links) {
                        if (link.songTitle() == null || link.itunesTrackId() == null || link.songArtist() == null) {
                                throw new BadRequestException("iTunesリンクの必須項目が不足しています");
                        }
                        ItunesTrackLink entity = ItunesTrackLink.builder()
                                        .submission(submission)
                                        .songTitle(link.songTitle())
                                        .songArtist(link.songArtist())
                                        .itunesTrackId(link.itunesTrackId())
                                        .itunesTitle(link.itunesTitle())
                                        .itunesArtist(link.itunesArtist())
                                        .itunesAlbumArtUrl(link.itunesAlbumArtUrl())
                                        .build();
                        itunesTrackLinkRepository.save(entity);
                }
        }

        private void assertAcceptingPublicSubmission(Live live) {
                if (live.getStatus() != LiveStatus.PUBLISHED) {
                        throw new BadRequestException("このライブは現在回答を受け付けていません");
                }

                LocalDateTime deadlineAt = live.getDeadlineAt();
                if (deadlineAt != null && deadlineAt.isBefore(LocalDateTime.now())) {
                        throw new BadRequestException("回答受付は終了しました");
                }
        }

        private void requireAdminTenantAccess(UUID tenantId, Long userId) {
                userTenantRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, userId)
                                .filter(ut -> ut.getRole().isAdminLevel())
                                .orElseThrow(() -> new TenantsNotFoundException("管理者権限がありません"));
        }
}

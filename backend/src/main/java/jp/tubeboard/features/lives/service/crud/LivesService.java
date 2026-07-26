package jp.tubeboard.features.lives.service.crud;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PdfCanvasUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PdfCanvasResponse;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.dto.request.PublicSongDuplicateCheckRequest;
import jp.tubeboard.features.lives.dto.response.PublicSongDuplicateCheckResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.exception.SettingSheetSubmissionConflictException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.pdf.SettingSheetPdfService;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.service.SettingSheetSubmissionService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.duplicate.SongDuplicateDetectionService;
import jp.tubeboard.features.lives.service.pdf.LivePdfCanvasService;
import java.io.IOException;
import java.io.UncheckedIOException;
import jp.tubeboard.features.tenants.model.Tenants;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
@Transactional(readOnly = true)
public class LivesService implements ILivesService {

        private static final Logger log = LoggerFactory.getLogger(LivesService.class);

        private final LiveRepository liveRepository;
        private final UserService userService;
        private final SettingSheetConfigService settingSheetConfigService;
        private final SettingSheetSubmissionService settingSheetSubmissionService;
        private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
        private final SongDuplicateDetectionService songDuplicateDetectionService;
        private final SettingSheetPdfService settingSheetPdfService;
        private final LivePdfCanvasService livePdfCanvasService;

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

                LiveResponse response = helper.toResponse(liveRepository.save(live));
                log.info("ライブを作成: id={}, tenantId={}, name={}", response.id(), request.tenantId(), request.name());
                return response;
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
                helper.findAdminTenant(tenantId, currentUser.getId());
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
                Live live = helper.findAdminTrashedLive(id);

                live.restore();
                liveRepository.save(live);
        }

        @Override
        @Transactional
        public void deleteSubmission(UUID liveId, UUID submissionId) {
                SettingSheetSubmission submission = helper.findAdminSubmission(liveId, submissionId);
                submission.markDeleted();
                settingSheetSubmissionRepository.save(submission);
        }

        @Override
        @Transactional
        public void restoreSubmission(UUID liveId, UUID submissionId) {
                SettingSheetSubmission submission = helper.findAdminTrashedSubmission(liveId, submissionId);
                submission.restore();
                settingSheetSubmissionRepository.save(submission);
        }

        @Override
        @Transactional
        public void purgeLive(UUID id) {
                Live live = helper.findAdminTrashedLive(id);

                settingSheetSubmissionRepository.deleteAllByLiveId(live.getId());
                liveRepository.delete(live);
        }

        @Override
        @Transactional
        public void purgeSubmission(UUID liveId, UUID submissionId) {
                SettingSheetSubmission submission = helper.findAdminTrashedSubmission(liveId, submissionId);
                settingSheetSubmissionRepository.delete(submission);
        }

        @Override
        public List<SettingSheetSubmissionResponse> listTrashedSubmissions(UUID liveId) {
                User currentUser = userService.getCurrentUser();
                helper.findAdminLive(liveId);
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
        public PdfCanvasResponse getPdfCanvas(UUID id) {
                CanvasDocument canvas = livePdfCanvasService.readPdfCanvas(helper.findOwnedLive(id));
                return new PdfCanvasResponse(canvas, canvas != null);
        }

        @Override
        @Transactional
        public PdfCanvasResponse updatePdfCanvas(UUID id, PdfCanvasUpdateRequest request) {
                Live live = helper.findAdminLive(id);

                live.setPdfCanvasJson(livePdfCanvasService.writePdfCanvas(request.canvas()));
                liveRepository.save(live);
                return new PdfCanvasResponse(request.canvas(), request.canvas() != null);
        }

        @Override
        @Transactional
        public SettingSheetSubmissionResponse submitPublicSettingSheet(String publicToken,
                        PublicSettingSheetSubmissionRequest request) {
                Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));
                SettingSheetSubmissionResponse response = helper.saveSubmission(live, request, null);
                log.info("セッティングシート提出を受信: liveId={}, submissionId={}", live.getId(), response.id());
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
                                submission.getVersion(),
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
                                                        submission.getVersion(),
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
                                submission.getVersion(),
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
                                submission.getVersion(),
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
                                                        submission.getVersion(),
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
                        Long baseVersion,
                        PublicSettingSheetSubmissionRequest request) {
                SettingSheetSubmission submission = helper.findPublicSubmission(publicToken, submissionId);
                assertNoConcurrentUpdate(publicToken, submissionId, baseVersion, submission);
                SettingSheetSubmissionResponse response = helper.saveSubmission(submission.getLive(), request,
                                submission);
                helper.triggerDuplicateDetection(submission.getLive().getId());
                return response;
        }

        /**
         * 読み込み時点の版と現在の版が食い違う場合、最新の提出内容を添えて 409 を返す。
         * baseVersion が null のクライアントはチェックせず、従来どおり上書きする。
         */
        private void assertNoConcurrentUpdate(String publicToken, UUID submissionId, Long baseVersion,
                        SettingSheetSubmission submission) {
                if (baseVersion == null || baseVersion.equals(submission.getVersion())) {
                        return;
                }

                throw new SettingSheetSubmissionConflictException(
                                "他の人がこのシートを更新しました",
                                getPublicSettingSheetSubmission(publicToken, submissionId));
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

        @Override
        public SubmissionPdfResult generateSubmissionPdf(UUID liveId, UUID submissionId, CanvasDocument canvas) {
                Live live = helper.findOwnedLive(liveId);
                LiveResponse liveResponse = helper.toResponse(live);
                SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);
                PublicSettingSheetSubmissionDetailResponse detail = getOwnedSettingSheetSubmission(liveId,
                                submissionId);
                try {
                        byte[] bytes = settingSheetPdfService.generate(liveResponse, config, detail,
                                        resolveCanvas(live, canvas));
                        return new SubmissionPdfResult(bytes, detail.recordLabel());
                } catch (IOException ex) {
                        log.error("PDF生成に失敗: liveId={}, submissionId={}", liveId, submissionId, ex);
                        throw new UncheckedIOException("PDF生成に失敗しました", ex);
                }
        }

        @Override
        public SubmissionPdfResult generateSubmissionsZip(UUID liveId, List<UUID> submissionIds, CanvasDocument canvas) {
                Live live = helper.findOwnedLive(liveId);
                LiveResponse liveResponse = helper.toResponse(live);
                SettingSheetConfigResponse config = settingSheetConfigService.readSettingSheetConfig(live);
                List<SettingSheetPdfService.SubmissionInputs> inputs = submissionIds.stream()
                                .map(id -> new SettingSheetPdfService.SubmissionInputs(liveResponse, config,
                                                getOwnedSettingSheetSubmission(liveId, id)))
                                .toList();
                try {
                        byte[] bytes = settingSheetPdfService.generateZip(inputs, resolveCanvas(live, canvas));
                        return new SubmissionPdfResult(bytes, live.getName() + "_セッティングシート");
                } catch (IOException ex) {
                        log.error("PDF ZIP生成に失敗: liveId={}, submissions={}", liveId, submissionIds.size(), ex);
                        throw new UncheckedIOException("PDF Zip生成に失敗しました", ex);
                }
        }

        /**
         * リクエストにレイアウトが無ければ、そのライブに保存済みのレイアウトを使う。
         * どちらも無い場合は null のままで、描画側が既定レイアウトを組み立てる。
         */
        private CanvasDocument resolveCanvas(Live live, CanvasDocument requested) {
                return requested != null ? requested : livePdfCanvasService.readPdfCanvas(live);
        }
}

package jp.tubeboard.features.lives.service.crud;

import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.request.PdfCanvasMeasureRequest;
import jp.tubeboard.features.lives.dto.request.PdfCanvasUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveCopySourceResponse;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PdfCanvasMeasureResponse;
import jp.tubeboard.features.lives.dto.response.PdfCanvasResponse;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.dto.request.PublicSongDuplicateCheckRequest;
import jp.tubeboard.features.lives.dto.response.PublicSongDuplicateCheckResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

public interface ILivesService {

        LiveResponse create(LiveCreateRequest request);

        List<LiveResponse> list();

        List<LiveResponse> listByTenant(UUID tenantId);

        /** フォーム設定・PDFレイアウトのコピー元候補（アクセスできる全テナントのライブ）。 */
        List<LiveCopySourceResponse> listCopySources();

        LiveResponse get(UUID id);

        LiveResponse update(LiveUpdateRequest request);

        void delete(UUID id);

        List<LiveResponse> listTrashedByTenant(UUID tenantId);

        void restoreLive(UUID id);

        void purgeLive(UUID id);

        PublicLiveResponse findPublicLive(String publicToken);

        SettingSheetConfigResponse getDefaultSettingSheetConfig();

        SettingSheetConfigResponse getSettingSheetConfig(UUID id);

        SettingSheetConfigResponse updateSettingSheetConfig(UUID id, SettingSheetConfigUpdateRequest request);

        PdfCanvasResponse getPdfCanvas(UUID id);

        PdfCanvasResponse updatePdfCanvas(UUID id, PdfCanvasUpdateRequest request);

        PdfCanvasMeasureResponse measurePdfCanvas(UUID id, PdfCanvasMeasureRequest request);

        SettingSheetSubmissionResponse submitPublicSettingSheet(String publicToken,
                        PublicSettingSheetSubmissionRequest request);

        List<SettingSheetSubmissionResponse> listOwnedSettingSheetSubmissions(UUID liveId);

        List<PublicSettingSheetSubmissionDetailResponse> listOwnedSettingSheetSubmissionDetails(UUID liveId);

        PublicSettingSheetSubmissionDetailResponse getOwnedSettingSheetSubmission(UUID liveId, UUID submissionId);

        PublicSettingSheetSubmissionDetailResponse getPublicSettingSheetSubmission(String publicToken,
                        UUID submissionId);

        PublicSettingSheetSubmissionDetailResponse getPublicSharedSettingSheetSubmission(String publicToken,
                        UUID submissionId);

        List<PublicSettingSheetSubmissionDetailResponse> listPublicSharedSettingSheetSubmissions(String publicToken);

        SettingSheetSubmissionResponse updatePublicSettingSheetSubmission(String publicToken,
                        UUID submissionId,
                        Long baseVersion,
                        PublicSettingSheetSubmissionRequest request);

        void deleteSubmission(UUID liveId, UUID submissionId);

        void restoreSubmission(UUID liveId, UUID submissionId);

        void purgeSubmission(UUID liveId, UUID submissionId);

        List<SettingSheetSubmissionResponse> listTrashedSubmissions(UUID liveId);

        SongDuplicateResponse detectSongDuplicates(UUID liveId);

        SongDuplicateResponse refreshSongDuplicates(UUID liveId);

        SongDuplicateResponse toggleDismissSongDuplicate(UUID liveId, String normalizedTitle);

        PublicSongDuplicateCheckResponse checkPublicSongDuplicate(String publicToken,
                        PublicSongDuplicateCheckRequest request, UUID excludeSubmissionId);

        SubmissionPdfResult generateSubmissionPdf(UUID liveId, UUID submissionId, CanvasDocument canvas);

        SubmissionPdfResult generateSubmissionsZip(UUID liveId, List<UUID> submissionIds, CanvasDocument canvas);

        record SubmissionPdfResult(byte[] bytes, String filenameStem) {
        }
}

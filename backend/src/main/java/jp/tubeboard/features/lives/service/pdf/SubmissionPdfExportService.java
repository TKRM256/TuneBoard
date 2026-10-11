package jp.tubeboard.features.lives.service.pdf;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.dto.request.PdfCanvasMeasureRequest;
import jp.tubeboard.features.lives.dto.request.PdfCanvasUpdateRequest;
import jp.tubeboard.features.lives.dto.response.PdfCanvasMeasureResponse;
import jp.tubeboard.features.lives.dto.response.PdfCanvasResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.pdf.SettingSheetCanvasMeasurer;
import jp.tubeboard.features.lives.pdf.SettingSheetPdfService;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.service.crud.LiveServiceHelper;
import jp.tubeboard.features.lives.service.export.ExportFiles;
import jp.tubeboard.features.lives.service.export.ExportResult;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader.ExportInputs;
import lombok.RequiredArgsConstructor;

/** 自由レイアウトの PDF（CanvasDocument）の保存・測定・出力。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubmissionPdfExportService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionPdfExportService.class);

    private final LiveRepository liveRepository;
    private final LiveServiceHelper helper;
    private final LivePdfCanvasService livePdfCanvasService;
    private final SettingSheetPdfService settingSheetPdfService;
    private final SettingSheetCanvasMeasurer canvasMeasurer;
    private final SubmissionExportLoader loader;

    public PdfCanvasResponse getPdfCanvas(UUID id) {
        CanvasDocument canvas = livePdfCanvasService.readPdfCanvas(helper.findOwnedLive(id));
        return new PdfCanvasResponse(canvas, canvas != null);
    }

    @Transactional
    public PdfCanvasResponse updatePdfCanvas(UUID id, PdfCanvasUpdateRequest request) {
        Live live = helper.findAdminLive(id);
        // page / elements が欠けたレイアウトは読み込み時に「未保存」と同じ扱いになり、保存済みの形が消えてしまう
        if (request.canvas().page() == null || request.canvas().elements() == null) {
            throw new BadRequestException("PDFレイアウトの形式が正しくありません");
        }

        live.setPdfCanvasJson(livePdfCanvasService.writePdfCanvas(request.canvas()));
        liveRepository.save(live);
        return new PdfCanvasResponse(request.canvas(), request.canvas() != null);
    }

    public PdfCanvasMeasureResponse measurePdfCanvas(UUID id, PdfCanvasMeasureRequest request) {
        ExportInputs inputs = loader.loadOne(id, request.submissionId());
        try {
            return new PdfCanvasMeasureResponse(canvasMeasurer.measureTables(inputs.live(), inputs.config(),
                    inputs.submission(), resolveCanvas(id, request.canvas())));
        } catch (IOException ex) {
            log.error("PDFレイアウトの測定に失敗: liveId={}, submissionId={}", id, request.submissionId(), ex);
            throw new UncheckedIOException("PDFレイアウトの測定に失敗しました", ex);
        }
    }

    public ExportResult generateSubmissionPdf(UUID liveId, UUID submissionId, CanvasDocument canvas) {
        ExportInputs inputs = loader.loadOne(liveId, submissionId);
        try {
            byte[] bytes = settingSheetPdfService.generate(inputs.live(), inputs.config(), inputs.submission(),
                    resolveCanvas(liveId, canvas));
            return new ExportResult(bytes, inputs.submission().recordLabel());
        } catch (IOException ex) {
            log.error("PDF生成に失敗: liveId={}, submissionId={}", liveId, submissionId, ex);
            throw new UncheckedIOException("PDF生成に失敗しました", ex);
        }
    }

    public ExportResult generateSubmissionsZip(UUID liveId, List<UUID> submissionIds, CanvasDocument canvas) {
        List<ExportInputs> inputs = loader.loadMany(liveId, submissionIds);
        CanvasDocument resolved = resolveCanvas(liveId, canvas);
        List<ExportFiles.ZipSource> sources = inputs.stream()
                .map(input -> new ExportFiles.ZipSource(input.submission().recordLabel(), "pdf",
                        out -> settingSheetPdfService.write(input.live(), input.config(), input.submission(),
                                resolved, out)))
                .toList();
        try {
            String liveName = inputs.isEmpty() ? "" : inputs.get(0).live().name();
            return new ExportResult(ExportFiles.zip(sources), liveName + "_セッティングシート");
        } catch (IOException ex) {
            log.error("PDF ZIP生成に失敗: liveId={}, submissions={}", liveId, submissionIds.size(), ex);
            throw new UncheckedIOException("PDF Zip生成に失敗しました", ex);
        }
    }

    /**
     * リクエストにレイアウトが無ければ、そのライブに保存済みのレイアウトを使う。
     * どちらも無い場合は null のままで、描画側が既定レイアウトを組み立てる。
     */
    private CanvasDocument resolveCanvas(UUID liveId, CanvasDocument requested) {
        return requested != null ? requested : livePdfCanvasService.readPdfCanvas(helper.findOwnedLive(liveId));
    }
}

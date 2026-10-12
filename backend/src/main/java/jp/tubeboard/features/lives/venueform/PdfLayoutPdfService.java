package jp.tubeboard.features.lives.venueform;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.export.context.CanvasContext;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer;
import jp.tubeboard.features.lives.pdf.canvas.table.TableMeasurer.MeasuredTable;
import jp.tubeboard.features.lives.pdf.draw.PdfBox;
import jp.tubeboard.features.lives.service.export.ExportFiles;
import jp.tubeboard.features.lives.service.export.ExportResult;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader.ExportInputs;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.TableMeasurement;
import jp.tubeboard.features.lives.venueform.PdfLayoutService.RenderSource;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.render.RenderWarnings;
import jp.tubeboard.features.lives.venueform.render.VenueFormRenderer;
import lombok.RequiredArgsConstructor;

/** PDF 書式に提出内容を書き込んだ PDF を作る。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PdfLayoutPdfService {

    private static final Logger log = LoggerFactory.getLogger(PdfLayoutPdfService.class);

    private final SubmissionExportLoader loader;
    private final PdfLayoutService layoutService;
    private final PdfFontLoader fontLoader;
    private final ExpressionEvaluator evaluator;

    public ExportResult generateOne(UUID liveId, UUID submissionId, UUID layoutId, VenueFormDocument requested) {
        ExportInputs inputs = loader.loadOne(liveId, submissionId);
        RenderSource source = layoutService.loadForRender(loader.loadLive(liveId).live(), layoutId, requested);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            write(inputs, source, out, new RenderWarnings());
            return new ExportResult(out.toByteArray(), inputs.submission().recordLabel());
        } catch (IOException ex) {
            log.error("PDFの生成に失敗: liveId={}, submissionId={}", liveId, submissionId, ex);
            throw new UncheckedIOException("PDFの生成に失敗しました", ex);
        }
    }

    public ExportResult generateZip(UUID liveId, List<UUID> submissionIds, UUID layoutId,
            VenueFormDocument requested) {
        List<ExportInputs> inputs = loader.loadMany(liveId, submissionIds);
        RenderSource source = layoutService.loadForRender(loader.loadLive(liveId).live(), layoutId, requested);
        List<ExportFiles.ZipSource> sources = inputs.stream()
                .map(input -> new ExportFiles.ZipSource(input.submission().recordLabel(), "pdf",
                        out -> write(input, source, out, new RenderWarnings())))
                .toList();
        try {
            String liveName = inputs.isEmpty() ? "" : inputs.get(0).live().name();
            return new ExportResult(ExportFiles.zip(sources), liveName + "_セッティングシート");
        } catch (IOException ex) {
            log.error("PDFのZIPの生成に失敗: liveId={}, submissions={}", liveId, submissionIds.size(), ex);
            throw new UncheckedIOException("PDFのZIPの生成に失敗しました", ex);
        }
    }

    /** 1 件の提出で描いてみて、表のあふれや条件式のエラーなどの警告を返す。 */
    public List<String> check(UUID liveId, UUID submissionId, UUID layoutId, VenueFormDocument requested) {
        ExportInputs inputs = loader.loadOne(liveId, submissionId);
        RenderSource source = layoutService.loadForRender(loader.loadLive(liveId).live(), layoutId, requested);
        RenderWarnings warnings = new RenderWarnings();
        try {
            write(inputs, source, OutputStream.nullOutputStream(), warnings);
        } catch (IOException ex) {
            throw new UncheckedIOException("書式の確認に失敗しました", ex);
        }
        return warnings.list();
    }

    /** 罫線つきの表それぞれが、この提出の全行を描くのに要る高さ。エディタで表の高さを中身に合わせるのに使う。 */
    public List<TableMeasurement> measure(UUID liveId, UUID submissionId, VenueFormDocument document) {
        if (document == null || document.elements() == null) {
            throw new BadRequestException("書式を送ってください");
        }
        ExportInputs inputs = loader.loadOne(liveId, submissionId);
        // 文字の幅は PDF に結び付いたフォントでしか測れないので、何も描かない PDF を作って測る
        try (PDDocument pdf = new PDDocument()) {
            FontChain fontChain = fontLoader.loadFontChain(pdf);
            Map<String, Object> namespace = CanvasContext.build(inputs.live(), inputs.config(), inputs.submission());
            TableMeasurer measurer = new TableMeasurer(evaluator);
            List<TableMeasurement> out = new ArrayList<>();
            for (VenueElement element : document.elements()) {
                if (element instanceof VenueElement.GridElement grid && grid.source() != null) {
                    float widthPt = (grid.wMm() == null ? 50f : grid.wMm()) * PdfBox.PT_PER_MM;
                    MeasuredTable measured = measurer.measure(grid.toTable(), widthPt, fontChain, namespace);
                    if (!measured.isEmpty()) {
                        out.add(new TableMeasurement(grid.id(), measured.naturalHeightPt() / PdfBox.PT_PER_MM));
                    }
                }
            }
            return out;
        } catch (IOException ex) {
            log.error("表の高さの測定に失敗: liveId={}, submissionId={}", liveId, submissionId, ex);
            throw new UncheckedIOException("表の高さの測定に失敗しました", ex);
        }
    }

    private void write(ExportInputs inputs, RenderSource source, OutputStream out, RenderWarnings warnings)
            throws IOException {
        try (PDDocument pdf = new PDDocument();
                VenueFormRenderer renderer = new VenueFormRenderer(evaluator, inputs.live(), inputs.config(),
                        inputs.submission(), source.resources())) {
            FontChain fontChain = fontLoader.loadFontChain(pdf);
            renderer.render(source.document(), pdf, fontChain, warnings);
            pdf.save(out);
        }
    }
}

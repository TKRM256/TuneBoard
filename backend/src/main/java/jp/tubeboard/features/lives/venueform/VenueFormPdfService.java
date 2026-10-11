package jp.tubeboard.features.lives.venueform;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;
import jp.tubeboard.features.lives.pdf.FontChain;
import jp.tubeboard.features.lives.pdf.PdfFontLoader;
import jp.tubeboard.features.lives.service.export.ExportFiles;
import jp.tubeboard.features.lives.service.export.ExportResult;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader.ExportInputs;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormService.RenderSource;
import jp.tubeboard.features.lives.venueform.render.RenderWarnings;
import jp.tubeboard.features.lives.venueform.render.VenueFormRenderer;
import lombok.RequiredArgsConstructor;

/** 会場書式に提出内容を書き込んだ PDF を作る。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueFormPdfService {

    private static final Logger log = LoggerFactory.getLogger(VenueFormPdfService.class);

    private final SubmissionExportLoader loader;
    private final VenueFormService venueFormService;
    private final PdfFontLoader fontLoader;
    private final ExpressionEvaluator evaluator;

    public ExportResult generateOne(UUID liveId, UUID submissionId, VenueFormDocument requested) {
        ExportInputs inputs = loader.loadOne(liveId, submissionId);
        RenderSource source = venueFormService.loadForRender(loader.loadLive(liveId).live(), requested);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            write(inputs, source, out, new RenderWarnings());
            return new ExportResult(out.toByteArray(), inputs.submission().recordLabel());
        } catch (IOException ex) {
            log.error("会場書式PDFの生成に失敗: liveId={}, submissionId={}", liveId, submissionId, ex);
            throw new UncheckedIOException("会場書式PDFの生成に失敗しました", ex);
        }
    }

    public ExportResult generateZip(UUID liveId, List<UUID> submissionIds, VenueFormDocument requested) {
        List<ExportInputs> inputs = loader.loadMany(liveId, submissionIds);
        RenderSource source = venueFormService.loadForRender(loader.loadLive(liveId).live(), requested);
        List<ExportFiles.ZipSource> sources = inputs.stream()
                .map(input -> new ExportFiles.ZipSource(input.submission().recordLabel(), "pdf",
                        out -> write(input, source, out, new RenderWarnings())))
                .toList();
        try {
            String liveName = inputs.isEmpty() ? "" : inputs.get(0).live().name();
            return new ExportResult(ExportFiles.zip(sources), liveName + "_会場書式");
        } catch (IOException ex) {
            log.error("会場書式ZIPの生成に失敗: liveId={}, submissions={}", liveId, submissionIds.size(), ex);
            throw new UncheckedIOException("会場書式ZIPの生成に失敗しました", ex);
        }
    }

    /** 1 件の提出で描いてみて、表のあふれや条件式のエラーなどの警告を返す。 */
    public List<String> check(UUID liveId, UUID submissionId, VenueFormDocument requested) {
        ExportInputs inputs = loader.loadOne(liveId, submissionId);
        RenderSource source = venueFormService.loadForRender(loader.loadLive(liveId).live(), requested);
        RenderWarnings warnings = new RenderWarnings();
        try {
            write(inputs, source, OutputStream.nullOutputStream(), warnings);
        } catch (IOException ex) {
            throw new UncheckedIOException("会場書式の確認に失敗しました", ex);
        }
        return warnings.list();
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

package jp.tubeboard.features.lives.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

/** Asks how tall each table of a layout would have to be to show one submission in full. */
public record PdfCanvasMeasureRequest(
        @NotNull(message = "PDFレイアウトが指定されていません") CanvasDocument canvas,
        @NotNull(message = "測定対象の提出が指定されていません") UUID submissionId) {
}

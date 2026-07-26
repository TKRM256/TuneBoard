package jp.tubeboard.features.lives.dto.request;

import jakarta.validation.constraints.NotNull;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

public record PdfCanvasUpdateRequest(
        @NotNull(message = "PDFレイアウトが指定されていません") CanvasDocument canvas) {
}

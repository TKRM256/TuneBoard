package jp.tubeboard.features.lives.dto.request;

import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

/**
 * Body of the single-submission PDF download endpoint. {@code canvas} is
 * optional; when absent the server builds a default canvas from the form
 * configuration.
 */
public record PdfGenerateRequest(CanvasDocument canvas) {
}

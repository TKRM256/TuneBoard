package jp.tubeboard.features.lives.dto.response;

import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

/**
 * @param canvas 保存済みのレイアウト。未保存なら null。
 * @param saved  レイアウトが保存済みかどうか。
 */
public record PdfCanvasResponse(CanvasDocument canvas, boolean saved) {
}

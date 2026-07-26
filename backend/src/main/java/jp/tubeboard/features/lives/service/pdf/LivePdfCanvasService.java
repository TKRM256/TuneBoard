package jp.tubeboard.features.lives.service.pdf;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

/**
 * ライブごとの PDF レイアウト（CanvasDocument）を JSON として読み書きする。
 * 保存されていない場合は null を返し、呼び出し側が既定レイアウトへフォールバックする。
 */
@Service
public class LivePdfCanvasService {

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    public CanvasDocument readPdfCanvas(Live live) {
        String json = live.getPdfCanvasJson();
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            CanvasDocument parsed = objectMapper.readValue(json, CanvasDocument.class);
            return parsed != null && parsed.page() != null ? parsed : null;
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    public boolean hasPdfCanvas(Live live) {
        return readPdfCanvas(live) != null;
    }

    public String writePdfCanvas(CanvasDocument canvas) {
        if (canvas == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(canvas);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("PDFレイアウトの保存に失敗しました", ex);
        }
    }
}

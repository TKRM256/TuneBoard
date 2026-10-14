package jp.tubeboard.features.lives.venueform;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.template.FormTemplateBuilder;
import lombok.RequiredArgsConstructor;

/** PDF 書式の JSON の読み書き。統合前の形で保存されたものは、読むときに今の形へ直す。 */
@Component
@RequiredArgsConstructor
public class PdfLayoutDocuments {

    private final FormTemplateBuilder formTemplateBuilder;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    /** 読めない JSON は null（呼び出し側で空の書式として扱う）。 */
    public VenueFormDocument read(LivePdfLayout layout) {
        try {
            if (LivePdfLayout.FORMAT_CANVAS_V1.equals(layout.getFormat())) {
                CanvasDocument canvas = objectMapper.readValue(layout.getLayoutJson(), CanvasDocument.class);
                return canvas == null ? null : LegacyCanvasConverter.convert(canvas);
            }
            return objectMapper.readValue(layout.getLayoutJson(), VenueFormDocument.class);
        } catch (JsonProcessingException ex) {
            return null;
        }
    }

    public void write(LivePdfLayout layout, VenueFormDocument document) {
        try {
            layout.setLayoutJson(objectMapper.writeValueAsString(document));
            layout.setFormat(LivePdfLayout.FORMAT_V2);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("書式の保存に失敗しました", ex);
        }
    }

    /** フォームの項目を順に並べた書式（B4 横）。書式を選ばずに出力するときと、フォームから書式を作るときに使う。 */
    public VenueFormDocument fromForm(SettingSheetConfigResponse config) {
        return fromForm(config, null, null);
    }

    /** 用紙の大きさを指定して並べる。白紙の書式に流し込むときに使う。 */
    public VenueFormDocument fromForm(SettingSheetConfigResponse config, Float widthMm, Float heightMm) {
        return formTemplateBuilder.build(config, widthMm, heightMm);
    }
}

package jp.tubeboard.features.lives.venueform;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasPage;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;

/**
 * 統合前の PDF レイアウト（1 枚の用紙に要素を並べる形）を、PDF 書式の形に直す。
 * 本番に保存されているレイアウトと、フォームから組み立てる既定のレイアウトの両方に使う。
 * 描かれる結果が変わらないよう、区切り線は横線に、表は罫線つきの表にする。スペーサーは何も描かないので捨てる。
 */
public final class LegacyCanvasConverter {

    static final String PAGE_ID = "page-1";
    private static final float DEFAULT_MARGIN_MM = 10f;
    /** 旧来の描画で、色の指定が無いときに使っていた色。 */
    private static final String LEGACY_TEXT_COLOR = "#000000";
    private static final String LEGACY_DIVIDER_COLOR = "#d1d5db";
    private static final float LEGACY_DIVIDER_THICKNESS = 0.6f;

    private LegacyCanvasConverter() {
    }

    public static VenueFormDocument convert(CanvasDocument canvas) {
        CanvasPage page = canvas == null ? null : canvas.page();
        PdfPaperSize size = page != null && page.size() != null ? page.size() : PdfPaperSize.A4;
        boolean landscape = page == null || page.orientation() == null || page.orientation() == PdfOrientation.LANDSCAPE;
        float widthMm = landscape ? size.heightMm() : size.widthMm();
        float heightMm = landscape ? size.widthMm() : size.heightMm();
        float marginMm = page != null && page.marginMm() != null ? page.marginMm() : DEFAULT_MARGIN_MM;

        List<CanvasElement> ordered = new ArrayList<>(canvas == null || canvas.elements() == null
                ? List.of()
                : canvas.elements());
        // 旧来は上にある要素から順に描いていたので、重なったときの前後もそれに合わせる
        ordered.removeIf(element -> element == null);
        ordered.sort(Comparator.comparing(element -> or(element.yMm(), 0f)));

        List<VenueElement> elements = new ArrayList<>();
        for (CanvasElement element : ordered) {
            VenueElement converted = convertElement(element);
            if (converted != null) {
                elements.add(converted);
            }
        }
        return new VenueFormDocument(List.of(new VenuePage(PAGE_ID, widthMm, heightMm, null, marginMm)), elements);
    }

    private static VenueElement convertElement(CanvasElement element) {
        String id = element.id();
        float x = or(element.xMm(), 0f);
        float y = or(element.yMm(), 0f);
        float w = Math.max(0.1f, or(element.wMm(), 50f));
        float h = Math.max(0.1f, or(element.hMm(), 10f));
        return switch (element) {
            case CanvasElement.TextElement t -> new VenueElement.TextElement(id, PAGE_ID, x, y, w, h, null,
                    t.content(), t.fontSizePt(), t.bold(), t.align(), t.verticalAlign(), color(t.color()), null,
                    t.backgroundColor(), t.borderColor(), t.borderThicknessPt());
            case CanvasElement.FieldElement f -> new VenueElement.FieldElement(id, PAGE_ID, x, y, w, h, null,
                    f.fieldId(), f.fontSizePt(), f.bold(), f.align(), f.verticalAlign(), color(f.color()), null,
                    f.backgroundColor(), f.borderColor(), f.borderThicknessPt(), f.showLabel(),
                    labelOf(f));
            case CanvasElement.DividerElement d -> new VenueElement.ShapeElement(id, PAGE_ID, x, y, w, h, null,
                    "line", d.color() == null ? LEGACY_DIVIDER_COLOR : d.color(),
                    d.thicknessPt() == null ? LEGACY_DIVIDER_THICKNESS : d.thicknessPt(), null);
            case CanvasElement.TableElement t -> new VenueElement.GridElement(id, PAGE_ID, x, y, w, h, null,
                    t.source(), t.columns(), t.showHeader(), t.fontSizePt(), t.headerFill(), t.borderColor(),
                    t.zebra(), t.autoGrow());
            case CanvasElement.SpacerElement s -> null;
        };
    }

    /** 名前を変えていない項目はフォームの項目名に任せ、フォーム側で名前を変えたときも追いつくようにする。 */
    private static String labelOf(CanvasElement.FieldElement field) {
        return field.labelOverride() == null || field.labelOverride().isBlank() ? null : field.labelOverride();
    }

    private static String color(String value) {
        return value == null || value.isBlank() ? LEGACY_TEXT_COLOR : value;
    }

    private static float or(Float value, float fallback) {
        return value != null && Float.isFinite(value) ? value : fallback;
    }
}

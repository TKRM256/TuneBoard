package jp.tubeboard.features.lives.pdf.canvas;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;

/**
 * Schema for the canvas-based PDF layout. Coordinates are millimeters with the
 * origin at the top-left of the page (PowerPoint convention).
 */
public final class CanvasSchema {

    private CanvasSchema() {
    }

    public record CanvasDocument(CanvasPage page, List<CanvasElement> elements) {
    }

    public record CanvasPage(
            PdfPaperSize size,
            PdfOrientation orientation,
            Float marginMm,
            Float baseFontSizePt) {
    }

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
            @JsonSubTypes.Type(value = CanvasElement.TextElement.class, name = "text"),
            @JsonSubTypes.Type(value = CanvasElement.FieldElement.class, name = "field"),
            @JsonSubTypes.Type(value = CanvasElement.DividerElement.class, name = "divider"),
            @JsonSubTypes.Type(value = CanvasElement.SpacerElement.class, name = "spacer"),
            @JsonSubTypes.Type(value = CanvasElement.TableElement.class, name = "table"),
    })
    public sealed interface CanvasElement {

        String id();

        Float xMm();

        Float yMm();

        Float wMm();

        Float hMm();

        record TextElement(String id, Float xMm, Float yMm, Float wMm, Float hMm,
                String content, Float fontSizePt, Boolean bold, Boolean italic,
                String align, String verticalAlign, String color,
                String backgroundColor, String borderColor, Float borderThicknessPt)
                implements CanvasElement {
        }

        record FieldElement(String id, Float xMm, Float yMm, Float wMm, Float hMm,
                String fieldId, String fallbackLabel, Boolean showLabel, String labelOverride,
                Float fontSizePt, Boolean bold, String align, String verticalAlign, String color,
                String backgroundColor, String borderColor, Float borderThicknessPt)
                implements CanvasElement {
        }

        record DividerElement(String id, Float xMm, Float yMm, Float wMm, Float hMm,
                String color, Float thicknessPt)
                implements CanvasElement {
        }

        record SpacerElement(String id, Float xMm, Float yMm, Float wMm, Float hMm)
                implements CanvasElement {
        }

        /**
         * @param autoGrow when not {@code false} the table grows downwards to fit
         *                 its rows, pushing later elements down and continuing on
         *                 the next page when it no longer fits. {@code hMm} then
         *                 acts as a minimum height.
         */
        record TableElement(String id, Float xMm, Float yMm, Float wMm, Float hMm,
                TableSource source, List<TableColumn> columns, Boolean showHeader,
                Float fontSizePt, String headerFill, String borderColor, Boolean zebra,
                Boolean autoGrow)
                implements CanvasElement {
        }
    }

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
            @JsonSubTypes.Type(value = TableSource.GroupSource.class, name = "group"),
            @JsonSubTypes.Type(value = TableSource.FieldsSource.class, name = "fields"),
    })
    public sealed interface TableSource {

        record GroupSource(String groupId, String fallbackLabel) implements TableSource {
        }

        record FieldsSource(List<FieldRef> fields) implements TableSource {
        }

        record FieldRef(String fieldId, String fallbackLabel) {
        }
    }

    /**
     * @param shrinkToFit    when {@code true} a cell whose text is too wide for
     *                       the column is drawn at a reduced font size instead of
     *                       being wrapped. Text that still does not fit at
     *                       {@code minFontSizePt} wraps as before.
     * @param minFontSizePt  lower bound for the shrinking above (defaults to 6pt).
     */
    public record TableColumn(
            String id,
            String header,
            String fieldId,
            Float widthRatio,
            String align,
            String format,
            Boolean shrinkToFit,
            Float minFontSizePt) {
    }
}

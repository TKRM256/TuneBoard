package jp.tubeboard.features.lives.venueform;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.stageplot.icon.IconNode;

/**
 * 会場書式のレイアウト。フロントの venue-form-schema.ts と同じ形にする。
 * 座標は各ページの左上を原点とした mm。
 */
public final class VenueFormSchema {

    private VenueFormSchema() {
    }

    public record VenueFormDocument(List<VenuePage> pages, List<VenueElement> elements) {
    }

    public record VenuePage(String id, Float widthMm, Float heightMm, PageBackground background) {
    }

    /** 背景に使うファイルとそのページ（画像は 0 のみ）。 */
    public record PageBackground(UUID assetId, Integer pageIndex) {
    }

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
            @JsonSubTypes.Type(value = VenueElement.TextElement.class, name = "text"),
            @JsonSubTypes.Type(value = VenueElement.FieldElement.class, name = "field"),
            @JsonSubTypes.Type(value = VenueElement.TableElement.class, name = "table"),
            @JsonSubTypes.Type(value = VenueElement.IconElement.class, name = "icon"),
            @JsonSubTypes.Type(value = VenueElement.ShapeElement.class, name = "shape"),
            @JsonSubTypes.Type(value = VenueElement.StagePlotElement.class, name = "stagePlot"),
    })
    public sealed interface VenueElement {

        String id();

        String pageId();

        Float xMm();

        Float yMm();

        Float wMm();

        Float hMm();

        /** JEXL の表示条件。空なら常に描く。 */
        String condition();

        /** 固定の文字、または {@code ${...}} の式を含む文字。 */
        record TextElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String content, Float fontSizePt, Boolean bold, String align, String verticalAlign, String color)
                implements VenueElement {
        }

        record FieldElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String fieldId, Float fontSizePt, Boolean bold, String align, String verticalAlign, String color)
                implements VenueElement {
        }

        /**
         * グループの回答を行ごとに書く。枠線や見出しは描かず、会場書式の罫線に合わせる。
         *
         * @param startIndex 何件目から書くか（1 始まり）
         * @param maxRows    書く行数。行の高さは {@code hMm / maxRows}
         */
        record TableElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String groupId, List<TableColumn> columns, Integer startIndex, Integer maxRows, Float fontSizePt,
                String color)
                implements VenueElement {
        }

        record IconElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String iconName, List<IconNode> nodes, String color, Float strokeWidth)
                implements VenueElement {
        }

        /** @param shape {@code ellipse} / {@code rect} / {@code line}（横線） */
        record ShapeElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String shape, String strokeColor, Float strokeWidthPt, String fillColor)
                implements VenueElement {
        }

        /**
         * ステージ配置図の回答を描く。グループ内の配置図は {@code groupId} と {@code itemIndex}（1 始まり）で選ぶ。
         *
         * @param mode {@code icons}（アイコンだけ。会場の図に重ねる）/ {@code withBase}（下絵ごと）
         */
        record StagePlotElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm,
                String condition, String fieldId, String groupId, Integer itemIndex, String mode,
                Float labelFontSizePt)
                implements VenueElement {
        }
    }
}

package jp.tubeboard.features.lives.venueform;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasElement;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.stageplot.icon.IconNode;

/**
 * PDF 書式のレイアウト。フロントの venue-form-schema.ts と同じ形にする。
 * 座標は各ページの左上を原点とした mm。背景（会場の書式）を敷いたページも、白紙のページも同じ形で表す。
 */
public final class VenueFormSchema {

    private VenueFormSchema() {
    }

    public record VenueFormDocument(List<VenuePage> pages, List<VenueElement> elements) {
    }

    /**
     * @param marginMm 伸びる表が次のページへ続くときの上下の余白。空なら 10mm
     */
    public record VenuePage(String id, Float widthMm, Float heightMm, PageBackground background, Float marginMm) {
    }

    /** 背景に使うファイルとそのページ（画像は 0 のみ）。 */
    public record PageBackground(UUID assetId, Integer pageIndex) {
    }

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
    @JsonSubTypes({
            @JsonSubTypes.Type(value = VenueElement.TextElement.class, name = "text"),
            @JsonSubTypes.Type(value = VenueElement.FieldElement.class, name = "field"),
            @JsonSubTypes.Type(value = VenueElement.TableElement.class, name = "table"),
            @JsonSubTypes.Type(value = VenueElement.GridElement.class, name = "grid"),
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

        /**
         * 固定の文字、または {@code ${...}} の式を含む文字。
         * shrinkToFit なら、折り返さずに 1 行で枠の幅に収まるまで文字を小さくする（下限あり）。
         */
        record TextElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String content, Float fontSizePt, Boolean bold, String align, String verticalAlign, String color,
                Boolean shrinkToFit, String backgroundColor, String borderColor, Float borderThicknessPt)
                implements VenueElement {
        }

        /** @param showLabel 「氏名: 田中」のように項目名を前に付ける。名前は labelOverride、空ならフォームの項目名 */
        record FieldElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                String fieldId, Float fontSizePt, Boolean bold, String align, String verticalAlign, String color,
                Boolean shrinkToFit, String backgroundColor, String borderColor, Float borderThicknessPt,
                Boolean showLabel, String labelOverride) implements VenueElement {
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

        /**
         * 罫線と見出しのある表。行の高さは中身に合わせて決まる。
         *
         * @param autoGrow 空でなければ、行が枠に入りきらないときに下へ伸び、下の要素を押し下げ、
         *                 ページに収まらない分は次のページに続ける。このとき hMm は最低の高さになる
         */
        record GridElement(String id, String pageId, Float xMm, Float yMm, Float wMm, Float hMm, String condition,
                TableSource source, List<TableColumn> columns, Boolean showHeader, Float fontSizePt,
                String headerFill, String borderColor, Boolean zebra, Boolean autoGrow)
                implements VenueElement {

            /** 測る・描く処理は旧来の表と共通なので、その形に直して渡す。 */
            public CanvasElement.TableElement toTable() {
                return new CanvasElement.TableElement(id, xMm, yMm, wMm, hMm, source, columns, showHeader,
                        fontSizePt, headerFill, borderColor, zebra, autoGrow);
            }
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

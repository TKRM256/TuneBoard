package jp.tubeboard.features.lives.venueform.lines;

/**
 * 書式の罫線 1 本。座標は背景（ページ全体）に対する比率（0〜1、左上が原点）。
 *
 * @param axis {@code h}（横線）か {@code v}（縦線）
 * @param pos  横線なら y、縦線なら x
 * @param from 線の始まり（横線なら x、縦線なら y）
 * @param to   線の終わり
 */
public record RuledLine(String axis, double pos, double from, double to) {

    public static final String HORIZONTAL = "h";
    public static final String VERTICAL = "v";
}

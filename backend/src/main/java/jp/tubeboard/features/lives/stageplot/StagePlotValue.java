package jp.tubeboard.features.lives.stageplot;

import java.util.List;

/**
 * 出演者が入力した配置図（STAGE_PLOT ブロックの回答）。
 * x, y は下絵に対するアイコン中心の位置（0〜1 の比率）。
 */
public record StagePlotValue(List<PlotItem> items) {

    public record PlotItem(String id, String paletteId, String label, Double x, Double y) {
    }

    public static StagePlotValue empty() {
        return new StagePlotValue(List.of());
    }

    public List<PlotItem> itemsOrEmpty() {
        return items == null ? List.of() : items;
    }
}

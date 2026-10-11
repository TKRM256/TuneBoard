package jp.tubeboard.features.lives.stageplot;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jp.tubeboard.features.lives.stageplot.icon.IconNode;

/**
 * ライブごとのステージ設定。下絵の画像と、出演者が配置図に置けるアイコンの一覧。
 *
 * @param aspectRatio 下絵が無いときのステージの縦横比（幅 / 高さ）。下絵があれば画像の比率を使う
 * @param iconScale   アイコンの大きさ（ステージの幅に対する比率）
 */
public record StagePlotSettings(UUID baseAssetId, Double aspectRatio, Double iconScale, List<PaletteItem> palette) {

    public static final double DEFAULT_ASPECT_RATIO = 1.6;
    public static final double DEFAULT_ICON_SCALE = 0.08;

    public record PaletteItem(String id, String iconName, String label, String color, List<IconNode> nodes) {
    }

    public static StagePlotSettings empty() {
        return new StagePlotSettings(null, DEFAULT_ASPECT_RATIO, DEFAULT_ICON_SCALE, List.of());
    }

    public double effectiveIconScale() {
        if (iconScale == null || !Double.isFinite(iconScale)) {
            return DEFAULT_ICON_SCALE;
        }
        return Math.max(0.02, Math.min(0.3, iconScale));
    }

    public double effectiveAspectRatio() {
        if (aspectRatio == null || !Double.isFinite(aspectRatio) || aspectRatio <= 0) {
            return DEFAULT_ASPECT_RATIO;
        }
        return Math.max(0.2, Math.min(5.0, aspectRatio));
    }

    public List<PaletteItem> paletteOrEmpty() {
        return palette == null ? List.of() : palette;
    }

    public Optional<PaletteItem> findPalette(String id) {
        return paletteOrEmpty().stream().filter(item -> item.id() != null && item.id().equals(id)).findFirst();
    }
}

package jp.tubeboard.features.lives.stageplot;

import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings.PaletteItem;

/** ステージ設定 API の入出力。 */
public final class StagePlotDtos {

    private StagePlotDtos() {
    }

    /** 管理画面向け。下絵ファイルの情報も返す。 */
    public record StagePlotResponse(StagePlotSettings settings, LiveAssetResponse base) {
    }

    /** 保存。下絵は専用の API で差し替えるので、ここでは受け取らない。 */
    public record StagePlotUpdateRequest(Double aspectRatio, Double iconScale, List<PaletteItem> palette) {
    }

    /** 会場書式のページの一部を下絵にする。範囲はページ全体に対する比率（0〜1）。 */
    public record StagePlotBaseFromVenueFormRequest(UUID assetId, Integer pageIndex, Double x, Double y,
            Double width, Double height) {
    }

    public record CopyFromRequest(UUID sourceLiveId) {
    }

    /** 出演者の公開フォーム向け。下絵は公開用の URL から取る。 */
    public record PublicStagePlotResponse(boolean hasBase, double aspectRatio, double iconScale,
            List<PaletteItem> palette) {
    }
}

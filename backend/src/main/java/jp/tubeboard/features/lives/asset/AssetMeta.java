package jp.tubeboard.features.lives.asset;

import java.util.List;

/**
 * アップロード時に読み取ったファイルの情報。毎回ファイルを開かずにページ数や大きさを返せるよう保存しておく。
 *
 * @param pages PDF はページごと、画像は 1 件。PDF の大きさは mm、画像はピクセル。
 */
public record AssetMeta(List<AssetPage> pages) {

    public record AssetPage(Float widthMm, Float heightMm, Integer widthPx, Integer heightPx) {
    }

    public int pageCount() {
        return pages == null ? 0 : pages.size();
    }
}

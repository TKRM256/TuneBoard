package jp.tubeboard.features.lives.asset;

import java.util.List;
import java.util.UUID;

import jp.tubeboard.features.lives.asset.AssetMeta.AssetPage;

/** 画面に返すファイルの情報（中身は含めない）。 */
public record LiveAssetResponse(UUID id, String fileName, String contentType, long sizeBytes, List<AssetPage> pages) {
}

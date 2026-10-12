package jp.tubeboard.features.lives.venueform;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Component;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.AssetRasterizer;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetPurpose;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.asset.LiveAssetService;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.PageBackground;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;
import lombok.RequiredArgsConstructor;

/** 書式の背景に使うファイル（会場の書式の PDF や画像）。ライブの書式すべてで共有する。 */
@Component
@RequiredArgsConstructor
public class PdfLayoutAssets {

    private final LiveAssetService assetService;
    private final AssetRasterizer rasterizer;

    public LiveAsset store(Live live, String fileName, byte[] bytes) {
        return assetService.store(live, LiveAssetPurpose.VENUE_FORM, fileName, bytes);
    }

    public LiveAsset find(Live live, UUID assetId) {
        return assetService.find(live.getId(), assetId, LiveAssetPurpose.VENUE_FORM);
    }

    public List<LiveAsset> list(Live live) {
        return assetService.list(live.getId(), LiveAssetPurpose.VENUE_FORM);
    }

    public List<LiveAssetResponse> responses(Live live) {
        return list(live).stream().map(assetService::toResponse).toList();
    }

    public LiveAssetResponse response(LiveAsset asset) {
        return assetService.toResponse(asset);
    }

    /** ファイルにそのページがあるか確かめる。 */
    public void requirePage(LiveAsset asset, int pageIndex) {
        if (pageIndex < 0 || pageIndex >= assetService.readMeta(asset).pageCount()) {
            throw new BadRequestException("ページが見つかりません");
        }
    }

    public byte[] pagePreview(LiveAsset asset, int pageIndex, int quality) {
        return rasterizer.previewPng(asset, pageIndex, quality);
    }

    public String pagePreviewContentType(LiveAsset asset) {
        return rasterizer.previewContentType(asset);
    }

    /** 背景に使えるファイルと、そのページ数（書式の検証に使う）。 */
    public Map<UUID, Integer> pageCounts(Live live) {
        Map<UUID, Integer> counts = new HashMap<>();
        for (LiveAsset asset : list(live)) {
            counts.put(asset.getId(), assetService.readMeta(asset).pageCount());
        }
        return counts;
    }

    /** 書式が使っている背景ファイルだけを ID で引けるようにする（描画用）。 */
    public Map<UUID, LiveAsset> backgroundsOf(Live live, VenueFormDocument document) {
        Set<UUID> referenced = referencedIds(document);
        Map<UUID, LiveAsset> backgrounds = new HashMap<>();
        for (LiveAsset asset : list(live)) {
            if (referenced.contains(asset.getId())) {
                backgrounds.put(asset.getId(), asset);
            }
        }
        return backgrounds;
    }

    /** source の書式が使っているファイルを target に複製し、背景の参照を付け替えた書式を返す。 */
    public VenueFormDocument copyReferenced(Live source, Live target, VenueFormDocument document) {
        Map<UUID, UUID> remapped = new HashMap<>();
        Set<UUID> referenced = referencedIds(document);
        for (LiveAsset asset : list(source)) {
            if (referenced.contains(asset.getId())) {
                remapped.put(asset.getId(), assetService.copyTo(asset, target).getId());
            }
        }
        List<VenuePage> pages = document.pages().stream()
                .map(page -> new VenuePage(page.id(), page.widthMm(), page.heightMm(),
                        page.background() == null ? null
                                : new PageBackground(remapped.get(page.background().assetId()),
                                        page.background().pageIndex()),
                        page.marginMm()))
                .toList();
        return new VenueFormDocument(pages, document.elements());
    }

    /** どの書式からも使われなくなったファイルを消す（差し替え前の古いファイルが溜まらないように）。 */
    public void deleteUnreferenced(Live live, List<VenueFormDocument> documents) {
        Set<UUID> referenced = new HashSet<>();
        documents.forEach(document -> referenced.addAll(referencedIds(document)));
        for (LiveAsset asset : list(live)) {
            if (!referenced.contains(asset.getId())) {
                assetService.delete(asset);
            }
        }
    }

    static Set<UUID> referencedIds(VenueFormDocument document) {
        Set<UUID> ids = new HashSet<>();
        if (document != null && document.pages() != null) {
            document.pages().stream()
                    .filter(Objects::nonNull)
                    .map(VenuePage::background)
                    .filter(Objects::nonNull)
                    .map(PageBackground::assetId)
                    .filter(Objects::nonNull)
                    .forEach(ids::add);
        }
        return ids;
    }
}

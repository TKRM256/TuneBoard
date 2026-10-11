package jp.tubeboard.features.lives.venueform;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.AssetRasterizer;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetPurpose;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.asset.LiveAssetService;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.service.crud.LiveServiceHelper;
import jp.tubeboard.features.lives.stageplot.StagePlotService;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormResponse;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.PageBackground;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;
import jp.tubeboard.features.lives.venueform.render.VenueFormRenderer;
import lombok.RequiredArgsConstructor;

/** 会場書式の取得・保存・背景のアップロード・他ライブからのコピー。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueFormService {

    private final LiveVenueFormRepository repository;
    private final LiveServiceHelper helper;
    private final LiveAssetService assetService;
    private final AssetRasterizer rasterizer;
    private final VenueFormValidator validator;
    private final StagePlotService stagePlotService;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    /** 描画に必要なもの一式。document は検証済み。 */
    public record RenderSource(VenueFormDocument document, VenueFormRenderer.Resources resources) {
    }

    public VenueFormResponse get(UUID liveId) {
        Live live = helper.findOwnedLive(liveId);
        return new VenueFormResponse(read(live), assetResponses(live));
    }

    @Transactional
    public VenueFormResponse save(UUID liveId, VenueFormDocument document) {
        Live live = helper.findAdminLive(liveId);
        validator.validate(document, pageCounts(live));
        LiveVenueForm form = repository.findByLiveIdAndDeletedAtIsNull(live.getId())
                .orElseGet(() -> LiveVenueForm.builder().live(live).build());
        form.setLayoutJson(write(document));
        repository.save(form);
        deleteUnreferencedAssets(live, document);
        return new VenueFormResponse(document, assetResponses(live));
    }

    @Transactional
    public LiveAssetResponse uploadAsset(UUID liveId, String fileName, byte[] bytes) {
        Live live = helper.findAdminLive(liveId);
        return assetService.toResponse(assetService.store(live, LiveAssetPurpose.VENUE_FORM, fileName, bytes));
    }

    public LiveAsset findAsset(UUID liveId, UUID assetId) {
        Live live = helper.findOwnedLive(liveId);
        return assetService.find(live.getId(), assetId, LiveAssetPurpose.VENUE_FORM);
    }

    public byte[] pagePreview(LiveAsset asset, int pageIndex, int quality) {
        return rasterizer.previewPng(asset, pageIndex, quality);
    }

    public String pagePreviewContentType(LiveAsset asset) {
        return rasterizer.previewContentType(asset);
    }

    /** 他のライブの会場書式を、背景のファイルごと複製して置き換える。 */
    @Transactional
    public VenueFormResponse copyFrom(UUID liveId, UUID sourceLiveId) {
        Live target = helper.findAdminLive(liveId);
        Live source = helper.findOwnedLive(sourceLiveId);
        VenueFormDocument sourceDoc = read(source);
        if (sourceDoc == null) {
            throw new BadRequestException("コピー元のライブに会場書式がありません");
        }
        if (source.getId().equals(target.getId())) {
            return get(liveId);
        }
        Map<UUID, UUID> remapped = new HashMap<>();
        for (LiveAsset asset : assetService.list(source.getId(), LiveAssetPurpose.VENUE_FORM)) {
            if (referencedAssetIds(sourceDoc).contains(asset.getId())) {
                remapped.put(asset.getId(), assetService.copyTo(asset, target).getId());
            }
        }
        List<VenuePage> pages = sourceDoc.pages().stream()
                .map(page -> new VenuePage(page.id(), page.widthMm(), page.heightMm(),
                        page.background() == null ? null
                                : new PageBackground(remapped.get(page.background().assetId()),
                                        page.background().pageIndex())))
                .toList();
        VenueFormDocument copied = new VenueFormDocument(pages, sourceDoc.elements());
        LiveVenueForm form = repository.findByLiveIdAndDeletedAtIsNull(target.getId())
                .orElseGet(() -> LiveVenueForm.builder().live(target).build());
        form.setLayoutJson(write(copied));
        repository.save(form);
        deleteUnreferencedAssets(target, copied);
        return new VenueFormResponse(copied, assetResponses(target));
    }

    /** 出力用。requested が無ければ保存済みの書式を使う。どちらも無ければ 400。 */
    public RenderSource loadForRender(Live live, VenueFormDocument requested) {
        VenueFormDocument document = requested != null ? requested : read(live);
        if (document == null || document.pages() == null || document.pages().isEmpty()) {
            throw new BadRequestException("会場書式が設定されていません");
        }
        validator.validate(document, pageCounts(live));
        Map<UUID, LiveAsset> backgrounds = new HashMap<>();
        Set<UUID> referenced = referencedAssetIds(document);
        for (LiveAsset asset : assetService.list(live.getId(), LiveAssetPurpose.VENUE_FORM)) {
            if (referenced.contains(asset.getId())) {
                backgrounds.put(asset.getId(), asset);
            }
        }
        StagePlotSettings stagePlot = stagePlotService.read(live);
        LiveAsset stageBase = stagePlotService.findBase(live, stagePlot);
        return new RenderSource(document, new VenueFormRenderer.Resources(backgrounds, stagePlot, stageBase));
    }

    public boolean hasVenueForm(Live live) {
        return read(live) != null;
    }

    private VenueFormDocument read(Live live) {
        return repository.findByLiveIdAndDeletedAtIsNull(live.getId())
                .map(form -> {
                    try {
                        return objectMapper.readValue(form.getLayoutJson(), VenueFormDocument.class);
                    } catch (JsonProcessingException ex) {
                        return null;
                    }
                })
                .orElse(null);
    }

    private String write(VenueFormDocument document) {
        try {
            return objectMapper.writeValueAsString(document);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("会場書式の保存に失敗しました", ex);
        }
    }

    private Map<UUID, Integer> pageCounts(Live live) {
        Map<UUID, Integer> counts = new HashMap<>();
        for (LiveAsset asset : assetService.list(live.getId(), LiveAssetPurpose.VENUE_FORM)) {
            counts.put(asset.getId(), assetService.readMeta(asset).pageCount());
        }
        return counts;
    }

    private List<LiveAssetResponse> assetResponses(Live live) {
        List<LiveAssetResponse> responses = new ArrayList<>();
        for (LiveAsset asset : assetService.list(live.getId(), LiveAssetPurpose.VENUE_FORM)) {
            responses.add(assetService.toResponse(asset));
        }
        return responses;
    }

    /** 書式から参照されなくなった背景ファイルを消す（差し替え前の古いファイルが溜まらないように）。 */
    private void deleteUnreferencedAssets(Live live, VenueFormDocument document) {
        Set<UUID> referenced = referencedAssetIds(document);
        for (LiveAsset asset : assetService.list(live.getId(), LiveAssetPurpose.VENUE_FORM)) {
            if (!referenced.contains(asset.getId())) {
                assetService.delete(asset);
            }
        }
    }

    private static Set<UUID> referencedAssetIds(VenueFormDocument document) {
        Set<UUID> ids = new HashSet<>();
        if (document.pages() != null) {
            document.pages().stream()
                    .map(VenuePage::background)
                    .filter(Objects::nonNull)
                    .map(PageBackground::assetId)
                    .filter(Objects::nonNull)
                    .forEach(ids::add);
        }
        return ids;
    }
}

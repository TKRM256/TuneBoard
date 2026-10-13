package jp.tubeboard.features.lives.venueform;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.service.crud.LiveServiceHelper;
import jp.tubeboard.features.lives.service.export.SubmissionExportLoader;
import jp.tubeboard.features.lives.stageplot.StagePlotService;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutSummary;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;
import jp.tubeboard.features.lives.venueform.render.VenueFormRenderer;
import lombok.RequiredArgsConstructor;

/** ライブの PDF 書式の一覧・作成・保存・削除・他のライブからの取り込みと、背景ファイルのアップロード。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PdfLayoutService {

    static final String SOURCE_FORM = "FORM";
    static final String SOURCE_BLANK = "BLANK";
    /** 白紙から作るときの 1 ページ目（A4 縦、続きのページの余白 10mm）。 */
    private static final VenuePage BLANK_A4 = new VenuePage("page-1", 210f, 297f, null, 10f);
    static final int MAX_LAYOUTS = 20;

    private final LivePdfLayoutRepository repository;
    private final LiveServiceHelper helper;
    private final PdfLayoutAssets assets;
    private final PdfLayoutDocuments documents;
    private final VenueFormValidator validator;
    private final StagePlotService stagePlotService;
    private final SubmissionExportLoader loader;

    /** 描画に必要なもの一式。document は検証済み。 */
    public record RenderSource(VenueFormDocument document, VenueFormRenderer.Resources resources) {
    }

    public List<LayoutSummary> list(UUID liveId) {
        Live live = helper.findOwnedLive(liveId);
        return layoutsOf(live).stream()
                .map(layout -> {
                    VenueFormDocument document = documents.read(layout);
                    int pageCount = document == null || document.pages() == null ? 0 : document.pages().size();
                    return new LayoutSummary(layout.getId(), layout.getName(), pageCount);
                })
                .toList();
    }

    public LayoutResponse get(UUID liveId, UUID layoutId) {
        Live live = helper.findOwnedLive(liveId);
        return toResponse(live, findLayout(live, layoutId));
    }

    @Transactional
    public LayoutResponse create(UUID liveId, String name, String source) {
        Live live = helper.findAdminLive(liveId);
        VenueFormDocument document = SOURCE_FORM.equals(source)
                ? documents.fromForm(loader.loadLive(liveId).config())
                : new VenueFormDocument(List.of(BLANK_A4), List.of());
        if (!SOURCE_FORM.equals(source) && !SOURCE_BLANK.equals(source)) {
            throw new BadRequestException("書式の作り方を選んでください");
        }
        return toResponse(live, insert(live, name, document));
    }

    @Transactional
    public LayoutResponse save(UUID liveId, UUID layoutId, String name, VenueFormDocument document) {
        Live live = helper.findAdminLive(liveId);
        LivePdfLayout layout = findLayout(live, layoutId);
        validator.validate(document, assets.pageCounts(live));
        layout.setName(name.trim());
        documents.write(layout, document);
        repository.save(layout);
        cleanUpAssets(live);
        return toResponse(live, layout);
    }

    @Transactional
    public void delete(UUID liveId, UUID layoutId) {
        Live live = helper.findAdminLive(liveId);
        LivePdfLayout layout = findLayout(live, layoutId);
        layout.markDeleted();
        repository.save(layout);
        cleanUpAssets(live);
    }

    /** 他のライブの書式を、背景のファイルごと複製して新しい書式として加える。 */
    @Transactional
    public LayoutResponse copyFrom(UUID liveId, UUID sourceLiveId, UUID sourceLayoutId) {
        Live target = helper.findAdminLive(liveId);
        Live source = helper.findOwnedLive(sourceLiveId);
        LivePdfLayout sourceLayout = findLayout(source, sourceLayoutId);
        VenueFormDocument sourceDocument = documents.read(sourceLayout);
        if (sourceDocument == null) {
            throw new BadRequestException("コピー元の書式を読み込めませんでした");
        }
        VenueFormDocument copied = source.getId().equals(target.getId())
                ? sourceDocument
                : assets.copyReferenced(source, target, sourceDocument);
        return toResponse(target, insert(target, sourceLayout.getName(), copied));
    }

    @Transactional
    public LiveAssetResponse uploadAsset(UUID liveId, String fileName, byte[] bytes) {
        return assets.response(assets.store(helper.findAdminLive(liveId), fileName, bytes));
    }

    public List<LiveAssetResponse> listAssets(UUID liveId) {
        return assets.responses(helper.findOwnedLive(liveId));
    }

    public LiveAsset findAsset(UUID liveId, UUID assetId) {
        return assets.find(helper.findOwnedLive(liveId), assetId);
    }

    public void requirePage(LiveAsset asset, int pageIndex) {
        assets.requirePage(asset, pageIndex);
    }

    public byte[] pagePreview(LiveAsset asset, int pageIndex, int quality) {
        return assets.pagePreview(asset, pageIndex, quality);
    }

    public String pagePreviewContentType(LiveAsset asset) {
        return assets.pagePreviewContentType(asset);
    }

    /**
     * 出力用。requested があればそれを、無ければ layoutId の保存済みの書式を、
     * どちらも無ければフォームの項目を並べた書式を使う。
     */
    public RenderSource loadForRender(Live live, UUID layoutId, VenueFormDocument requested) {
        VenueFormDocument document = requested;
        if (document == null && layoutId != null) {
            document = documents.read(findLayout(live, layoutId));
        }
        if (document == null) {
            document = documents.fromForm(loader.loadLive(live.getId()).config());
        }
        if (document.pages() == null || document.pages().isEmpty()) {
            throw new BadRequestException("書式にページがありません");
        }
        validator.validate(document, assets.pageCounts(live));
        StagePlotSettings stagePlot = stagePlotService.read(live);
        LiveAsset stageBase = stagePlotService.findBase(live, stagePlot);
        return new RenderSource(document, new VenueFormRenderer.Resources(assets.backgroundsOf(live, document),
                stagePlot, stageBase));
    }

    private LivePdfLayout insert(Live live, String name, VenueFormDocument document) {
        List<LivePdfLayout> existing = layoutsOf(live);
        if (existing.size() >= MAX_LAYOUTS) {
            throw new BadRequestException("書式は1つのライブに" + MAX_LAYOUTS + "個までです");
        }
        validator.validate(document, assets.pageCounts(live));
        int nextOrder = existing.stream().mapToInt(LivePdfLayout::getSortOrder).max().orElse(-1) + 1;
        LivePdfLayout layout = LivePdfLayout.builder().live(live).name(name.trim()).sortOrder(nextOrder).build();
        documents.write(layout, document);
        return repository.save(layout);
    }

    private List<LivePdfLayout> layoutsOf(Live live) {
        return repository.findByLiveIdAndDeletedAtIsNullOrderBySortOrderAscCreatedAtAsc(live.getId());
    }

    private LivePdfLayout findLayout(Live live, UUID layoutId) {
        if (layoutId == null) {
            throw new BadRequestException("書式を選んでください");
        }
        return repository.findByIdAndLiveIdAndDeletedAtIsNull(layoutId, live.getId())
                .orElseThrow(() -> new LivesNotFoundException("書式が見つかりません"));
    }

    private void cleanUpAssets(Live live) {
        assets.deleteUnreferenced(live, layoutsOf(live).stream().map(documents::read).filter(Objects::nonNull)
                .toList());
    }

    private LayoutResponse toResponse(Live live, LivePdfLayout layout) {
        VenueFormDocument document = documents.read(layout);
        return new LayoutResponse(layout.getId(), layout.getName(),
                document == null ? new VenueFormDocument(List.of(), List.of()) : document, assets.responses(live));
    }
}

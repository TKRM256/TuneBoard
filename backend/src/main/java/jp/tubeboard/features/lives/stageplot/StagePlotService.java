package jp.tubeboard.features.lives.stageplot;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;

import jp.tubeboard.common.exception.EditConflictException;
import jp.tubeboard.common.model.Revisions;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.AssetMeta;
import jp.tubeboard.features.lives.asset.AssetRasterizer;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetPurpose;
import jp.tubeboard.features.lives.asset.LiveAssetService;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.service.crud.LiveServiceHelper;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.PublicStagePlotResponse;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.StagePlotBaseFromVenueFormRequest;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.StagePlotResponse;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.StagePlotUpdateRequest;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings.PaletteItem;
import jp.tubeboard.features.lives.stageplot.icon.IconNodeValidator;
import lombok.RequiredArgsConstructor;

/** ライブごとのステージ設定（下絵・アイコンの一覧）の読み書き。 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StagePlotService {

    private static final int MAX_PALETTE = 40;
    private static final int MAX_LABEL = 30;

    private final LiveRepository liveRepository;
    private final LiveServiceHelper helper;
    private final LiveAssetService assetService;
    private final AssetRasterizer rasterizer;
    private final StagePlotSettingsReader settingsReader;

    public StagePlotSettings read(Live live) {
        return settingsReader.read(live);
    }

    public StagePlotResponse get(UUID liveId) {
        return toResponse(helper.findOwnedLive(liveId));
    }

    @Transactional
    public StagePlotResponse update(UUID liveId, StagePlotUpdateRequest request) {
        Live live = helper.findAdminLive(liveId);
        StagePlotSettings current = read(live);
        if (Revisions.conflicts(request.baseRevision(), revisionOf(current))) {
            throw new EditConflictException("他の人がステージ設定を更新しました。再読み込みしてから、もう一度保存してください。");
        }
        List<PaletteItem> palette = validatePalette(request.palette());
        write(live, new StagePlotSettings(current.baseAssetId(), request.aspectRatio(), request.iconScale(), palette));
        return toResponse(live);
    }

    @Transactional
    public StagePlotResponse uploadBase(UUID liveId, String fileName, byte[] bytes) {
        Live live = helper.findAdminLive(liveId);
        replaceBase(live, assetService.store(live, LiveAssetPurpose.STAGE_BASE, fileName, bytes));
        return toResponse(live);
    }

    @Transactional
    public StagePlotResponse baseFromVenueForm(UUID liveId, StagePlotBaseFromVenueFormRequest request) {
        Live live = helper.findAdminLive(liveId);
        if (request.assetId() == null || request.x() == null || request.y() == null || request.width() == null
                || request.height() == null) {
            throw new BadRequestException("切り出す範囲を指定してください");
        }
        LiveAsset source = assetService.find(live.getId(), request.assetId(), LiveAssetPurpose.VENUE_FORM);
        byte[] png = rasterizer.cropPng(source, request.pageIndex() == null ? 0 : request.pageIndex(),
                new AssetRasterizer.CropRect(request.x(), request.y(), request.width(), request.height()));
        replaceBase(live, assetService.storeGenerated(live, LiveAssetPurpose.STAGE_BASE, "stage-base.png", png));
        return toResponse(live);
    }

    @Transactional
    public StagePlotResponse deleteBase(UUID liveId) {
        Live live = helper.findAdminLive(liveId);
        replaceBase(live, null);
        return toResponse(live);
    }

    public LiveAsset baseImage(UUID liveId) {
        return requireBase(helper.findOwnedLive(liveId));
    }

    public LiveAsset publicBaseImage(String publicToken) {
        Live live = liveRepository.findByPublicTokenAndDeletedAtIsNull(publicToken)
                .orElseThrow(() -> new LivesNotFoundException("公開ライブが見つかりません"));
        return requireBase(live);
    }

    /** 他のライブの設定を下絵ごと複製する。 */
    @Transactional
    public StagePlotResponse copyFrom(UUID liveId, UUID sourceLiveId) {
        Live target = helper.findAdminLive(liveId);
        Live source = helper.findOwnedLive(sourceLiveId);
        if (source.getId().equals(target.getId())) {
            return toResponse(target);
        }
        StagePlotSettings settings = read(source);
        LiveAsset sourceBase = findBase(source, settings);
        // 先に今の下絵を外してから複製する（後から外すと複製した下絵まで消える）
        replaceBase(target, null);
        LiveAsset copiedBase = sourceBase == null ? null : assetService.copyTo(sourceBase, target);
        write(target, new StagePlotSettings(copiedBase == null ? null : copiedBase.getId(), settings.aspectRatio(),
                settings.iconScale(), settings.paletteOrEmpty()));
        return toResponse(target);
    }

    public PublicStagePlotResponse toPublic(Live live) {
        StagePlotSettings settings = read(live);
        LiveAsset base = findBase(live, settings);
        return new PublicStagePlotResponse(base != null, aspectRatio(settings, base), settings.effectiveIconScale(),
                settings.paletteOrEmpty());
    }

    public boolean hasSettings(Live live) {
        return !read(live).paletteOrEmpty().isEmpty();
    }

    /** 描画用。下絵が無ければ null。 */
    public LiveAsset findBase(Live live, StagePlotSettings settings) {
        if (settings.baseAssetId() == null) {
            return null;
        }
        return assetService.list(live.getId(), LiveAssetPurpose.STAGE_BASE).stream()
                .filter(asset -> asset.getId().equals(settings.baseAssetId()))
                .findFirst()
                .orElse(null);
    }

    private LiveAsset requireBase(Live live) {
        LiveAsset base = findBase(live, read(live));
        if (base == null) {
            throw new LivesNotFoundException("下絵が設定されていません");
        }
        return base;
    }

    /** 下絵を差し替え、古い下絵のファイルは消す。null なら下絵を外す。 */
    private void replaceBase(Live live, LiveAsset newBase) {
        StagePlotSettings current = read(live);
        for (LiveAsset asset : assetService.list(live.getId(), LiveAssetPurpose.STAGE_BASE)) {
            if (newBase == null || !asset.getId().equals(newBase.getId())) {
                assetService.delete(asset);
            }
        }
        Double aspect = newBase == null ? current.aspectRatio() : aspectRatio(current, newBase);
        write(live, new StagePlotSettings(newBase == null ? null : newBase.getId(), aspect, current.iconScale(),
                current.paletteOrEmpty()));
    }

    private double aspectRatio(StagePlotSettings settings, LiveAsset base) {
        if (base != null) {
            AssetMeta meta = assetService.readMeta(base);
            if (meta.pageCount() > 0 && meta.pages().get(0).widthPx() != null && meta.pages().get(0).heightPx() != null
                    && meta.pages().get(0).heightPx() > 0) {
                return (double) meta.pages().get(0).widthPx() / meta.pages().get(0).heightPx();
            }
        }
        return settings.effectiveAspectRatio();
    }

    private List<PaletteItem> validatePalette(List<PaletteItem> palette) {
        List<PaletteItem> items = palette == null ? List.of() : palette;
        if (items.size() > MAX_PALETTE) {
            throw new BadRequestException("アイコンは" + MAX_PALETTE + "個までです");
        }
        Set<String> ids = new HashSet<>();
        for (PaletteItem item : items) {
            if (item == null || item.id() == null || item.id().isBlank() || item.id().length() > 64
                    || !ids.add(item.id())) {
                throw new BadRequestException("アイコンの設定が正しくありません");
            }
            if (item.label() == null || item.label().isBlank() || item.label().length() > MAX_LABEL) {
                throw new BadRequestException("アイコンの名前は1〜" + MAX_LABEL + "文字で入力してください");
            }
            if (item.color() != null && item.color().length() > 32) {
                throw new BadRequestException("アイコンの色が正しくありません");
            }
            String problem = IconNodeValidator.check(item.iconName(), item.nodes());
            if (problem != null) {
                throw new BadRequestException(problem);
            }
        }
        return List.copyOf(items);
    }

    private void write(Live live, StagePlotSettings settings) {
        live.setStagePlotJson(settingsReader.write(settings));
        liveRepository.save(live);
    }

    private StagePlotResponse toResponse(Live live) {
        StagePlotSettings settings = read(live);
        LiveAsset base = findBase(live, settings);
        return new StagePlotResponse(settings, base == null ? null : assetService.toResponse(base), revisionOf(settings));
    }

    /** 下絵は別の API ですぐ差し替わるので、この画面で保存する横縦比・大きさ・アイコンだけから作る。 */
    private String revisionOf(StagePlotSettings settings) {
        return Revisions.of(settingsReader.write(new StagePlotSettings(null, settings.aspectRatio(), settings.iconScale(), settings.palette())));
    }
}

package jp.tubeboard.features.lives.asset;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.model.Live;
import lombok.RequiredArgsConstructor;

/** ライブに紐づくファイルの保存・読み出し・コピー。権限の確認は呼び出し側で済ませておく。 */
@Service
@RequiredArgsConstructor
public class LiveAssetService {

    private static final int MAX_FILE_NAME_LENGTH = 200;

    private final LiveAssetRepository repository;
    private final AssetInspector inspector;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    public LiveAsset store(Live live, LiveAssetPurpose purpose, String fileName, byte[] bytes) {
        AssetInspector.Inspection inspection = inspector.inspect(bytes, purpose == LiveAssetPurpose.VENUE_FORM);
        return save(live, purpose, fileName, inspection.contentType(), bytes, inspection.meta());
    }

    /** サーバーで作った画像（切り出した下絵など）を保存する。中身はこちらで作ったものなので検査は簡易に済ませる。 */
    public LiveAsset storeGenerated(Live live, LiveAssetPurpose purpose, String fileName, byte[] pngBytes) {
        AssetInspector.Inspection inspection = inspector.inspect(pngBytes, false);
        return save(live, purpose, fileName, inspection.contentType(), pngBytes, inspection.meta());
    }

    public LiveAsset find(UUID liveId, UUID assetId, LiveAssetPurpose purpose) {
        return repository.findByIdAndLiveIdAndPurposeAndDeletedAtIsNull(assetId, liveId, purpose)
                .orElseThrow(() -> new LivesNotFoundException("ファイルが見つかりません"));
    }

    public List<LiveAsset> list(UUID liveId, LiveAssetPurpose purpose) {
        return repository.findAllByLiveIdAndPurposeAndDeletedAtIsNullOrderByCreatedAtAsc(liveId, purpose);
    }

    public LiveAsset copyTo(LiveAsset source, Live target) {
        return repository.save(LiveAsset.builder()
                .live(target)
                .purpose(source.getPurpose())
                .fileName(source.getFileName())
                .contentType(source.getContentType())
                .content(source.getContent())
                .sizeBytes(source.getSizeBytes())
                .metaJson(source.getMetaJson())
                .build());
    }

    public void delete(LiveAsset asset) {
        repository.delete(asset);
    }

    public AssetMeta readMeta(LiveAsset asset) {
        try {
            return objectMapper.readValue(asset.getMetaJson(), AssetMeta.class);
        } catch (JsonProcessingException ex) {
            return new AssetMeta(List.of());
        }
    }

    public LiveAssetResponse toResponse(LiveAsset asset) {
        return new LiveAssetResponse(asset.getId(), asset.getFileName(), asset.getContentType(),
                asset.getSizeBytes(), readMeta(asset).pages());
    }

    private LiveAsset save(Live live, LiveAssetPurpose purpose, String fileName, String contentType,
            byte[] bytes, AssetMeta meta) {
        try {
            return repository.save(LiveAsset.builder()
                    .live(live)
                    .purpose(purpose)
                    .fileName(normalizeFileName(fileName))
                    .contentType(contentType)
                    .content(bytes)
                    .sizeBytes(bytes.length)
                    .metaJson(objectMapper.writeValueAsString(meta))
                    .build());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("ファイル情報の保存に失敗しました", ex);
        }
    }

    private static String normalizeFileName(String fileName) {
        String name = fileName == null ? "" : fileName.replaceAll("[\\\\/\\r\\n\\t]", "_").trim();
        if (name.isEmpty()) {
            return "file";
        }
        return name.length() > MAX_FILE_NAME_LENGTH ? name.substring(0, MAX_FILE_NAME_LENGTH) : name;
    }
}

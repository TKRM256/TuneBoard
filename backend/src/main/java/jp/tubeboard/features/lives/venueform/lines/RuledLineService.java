package jp.tubeboard.features.lives.venueform.lines;

import java.util.List;
import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.asset.LiveAsset;
import lombok.RequiredArgsConstructor;

/**
 * 背景のページの罫線を返す。一度検出したものは保存しておき、検出方法が変わったときだけ検出し直す。
 * 検出に時間がかかるのでトランザクションの外で行い、保存だけをリポジトリのトランザクションで行う。
 */
@Service
@RequiredArgsConstructor
public class RuledLineService {

    private static final TypeReference<List<RuledLine>> LINES = new TypeReference<>() {
    };

    private final PageLineDetector detector;
    private final LiveAssetPageLinesRepository repository;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    public List<RuledLine> linesFor(LiveAsset asset, int pageIndex) {
        Optional<LiveAssetPageLines> saved = repository.findByAssetIdAndPageIndex(asset.getId(), pageIndex);
        if (saved.isPresent() && saved.get().getAlgorithmVersion() == PageLineDetector.ALGORITHM_VERSION) {
            return read(saved.get().getLinesJson());
        }
        List<RuledLine> lines = detector.detect(asset, pageIndex);
        LiveAssetPageLines row = saved.orElseGet(() -> LiveAssetPageLines.builder()
                .assetId(asset.getId())
                .pageIndex(pageIndex)
                .build());
        row.setAlgorithmVersion(PageLineDetector.ALGORITHM_VERSION);
        row.setLinesJson(write(lines));
        try {
            repository.save(row);
        } catch (DataIntegrityViolationException ex) {
            // 同じページを同時に開いて先に保存された。どちらも同じ結果なのでそのまま返す
        }
        return lines;
    }

    private List<RuledLine> read(String json) {
        try {
            return objectMapper.readValue(json, LINES);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("保存した罫線を読み込めませんでした", ex);
        }
    }

    private String write(List<RuledLine> lines) {
        try {
            return objectMapper.writeValueAsString(lines);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("罫線を保存できませんでした", ex);
        }
    }
}

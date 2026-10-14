package jp.tubeboard.features.lives.stageplot;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.model.Live;

/**
 * ライブに保存されたステージ設定を読む。提出の検証からも使うので、
 * 権限確認などを持つ StagePlotService とは分けておく（依存の循環を避ける）。
 */
@Component
public class StagePlotSettingsReader {

    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    public StagePlotSettings read(Live live) {
        String json = live.getStagePlotJson();
        if (json == null || json.isBlank()) {
            return StagePlotSettings.empty();
        }
        try {
            StagePlotSettings parsed = objectMapper.readValue(json, StagePlotSettings.class);
            return parsed == null ? StagePlotSettings.empty() : parsed;
        } catch (JsonProcessingException ex) {
            return StagePlotSettings.empty();
        }
    }

    public String write(StagePlotSettings settings) {
        try {
            return objectMapper.writeValueAsString(settings);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("ステージ設定の保存に失敗しました", ex);
        }
    }
}

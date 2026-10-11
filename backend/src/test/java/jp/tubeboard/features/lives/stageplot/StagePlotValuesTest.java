package jp.tubeboard.features.lives.stageplot;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.stageplot.StagePlotSettings.PaletteItem;
import jp.tubeboard.features.lives.stageplot.icon.IconNode;

class StagePlotValuesTest {

    private final StagePlotSettings settings = new StagePlotSettings(null, 1.6, 0.08, List.of(
            new PaletteItem("gt", "guitar", "Gt", "#111827",
                    List.of(new IconNode("circle", Map.of("cx", "12", "cy", "12", "r", "10"))))));

    @Test
    void 正しい配置図は通る() {
        String json = "{\"items\":[{\"id\":\"1\",\"paletteId\":\"gt\",\"label\":\"Gt 田中\",\"x\":0.5,\"y\":0.2}]}";
        assertThat(StagePlotValues.validate(json, settings)).isNull();
        assertThat(StagePlotValues.labels(json)).containsExactly("Gt 田中");
    }

    @Test
    void 範囲外の位置や知らないアイコンは弾く() {
        assertThat(StagePlotValues.validate(
                "{\"items\":[{\"id\":\"1\",\"paletteId\":\"gt\",\"x\":1.5,\"y\":0.2}]}", settings))
                .contains("位置");
        assertThat(StagePlotValues.validate(
                "{\"items\":[{\"id\":\"1\",\"paletteId\":\"drum\",\"x\":0.5,\"y\":0.2}]}", settings))
                .contains("使えないアイコン");
        assertThat(StagePlotValues.validate("not json", settings)).contains("形式");
    }

    @Test
    void 長すぎるラベルや多すぎるアイコンは弾く() {
        String longLabel = "a".repeat(StagePlotValues.MAX_LABEL_LENGTH + 1);
        assertThat(StagePlotValues.validate(
                "{\"items\":[{\"id\":\"1\",\"paletteId\":\"gt\",\"label\":\"" + longLabel + "\",\"x\":0.5,\"y\":0.2}]}",
                settings)).contains("文字以内");

        StringBuilder many = new StringBuilder("{\"items\":[");
        for (int i = 0; i <= StagePlotValues.MAX_ITEMS; i++) {
            if (i > 0) many.append(',');
            many.append("{\"id\":\"").append(i).append("\",\"paletteId\":\"gt\",\"x\":0.1,\"y\":0.1}");
        }
        many.append("]}");
        assertThat(StagePlotValues.validate(many.toString(), settings)).contains("個まで");
    }

    @Test
    void 読めない値は空の配置図として扱う() {
        assertThat(StagePlotValues.parse("{broken").itemsOrEmpty()).isEmpty();
        assertThat(StagePlotValues.parse(null).itemsOrEmpty()).isEmpty();
        assertThat(StagePlotValues.labels("{broken")).isEmpty();
    }
}

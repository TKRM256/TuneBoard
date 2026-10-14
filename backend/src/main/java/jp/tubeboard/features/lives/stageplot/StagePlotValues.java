package jp.tubeboard.features.lives.stageplot;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.stageplot.StagePlotValue.PlotItem;

/** 配置図の回答（JSON 文字列）の読み取り・検証・要約。 */
public final class StagePlotValues {

    public static final int MAX_ITEMS = 50;
    public static final int MAX_LABEL_LENGTH = 50;
    public static final int MAX_JSON_LENGTH = 20_000;

    private static final ObjectMapper MAPPER = JsonMapper.builder().findAndAddModules().build();

    private StagePlotValues() {
    }

    /** 読めない値は空の配置図として扱う（描画や表示を止めない）。 */
    public static StagePlotValue parse(String json) {
        if (json == null || json.isBlank() || json.length() > MAX_JSON_LENGTH) {
            return StagePlotValue.empty();
        }
        try {
            StagePlotValue value = MAPPER.readValue(json, StagePlotValue.class);
            return value == null ? StagePlotValue.empty() : value;
        } catch (JsonProcessingException ex) {
            return StagePlotValue.empty();
        }
    }

    /** 提出時の検証。問題があれば利用者向けのメッセージ、無ければ null。 */
    public static String validate(String json, StagePlotSettings settings) {
        if (json.length() > MAX_JSON_LENGTH) {
            return "配置図のデータが大きすぎます。";
        }
        StagePlotValue value;
        try {
            value = MAPPER.readValue(json, StagePlotValue.class);
        } catch (JsonProcessingException ex) {
            return "配置図の形式が正しくありません。";
        }
        List<PlotItem> items = value == null ? List.of() : value.itemsOrEmpty();
        if (items.size() > MAX_ITEMS) {
            return "配置図のアイコンは" + MAX_ITEMS + "個までです。";
        }
        for (PlotItem item : items) {
            if (item == null || item.x() == null || item.y() == null
                    || !inUnitRange(item.x()) || !inUnitRange(item.y())) {
                return "配置図のアイコンの位置が正しくありません。";
            }
            if (item.label() != null && item.label().length() > MAX_LABEL_LENGTH) {
                return "配置図のラベルは" + MAX_LABEL_LENGTH + "文字以内で入力してください。";
            }
            if (settings.findPalette(item.paletteId()).isEmpty()) {
                return "配置図に使えないアイコンが含まれています。";
            }
        }
        return null;
    }

    /**
     * 一覧や式で使う要約。置いたアイコンのラベルを並べる。
     * ラベルは置いた時点でパレットの名前が入るので、通常は空にならない。
     */
    public static List<String> labels(String json) {
        return parse(json).itemsOrEmpty().stream()
                .filter(Objects::nonNull)
                .map(item -> item.label() == null ? "" : item.label().trim())
                .filter(label -> !label.isBlank())
                .toList();
    }

    public static String resolveLabel(PlotItem item, StagePlotSettings settings) {
        if (item.label() != null && !item.label().isBlank()) {
            return item.label().trim();
        }
        return settings.findPalette(item.paletteId()).map(p -> p.label() == null ? "" : p.label()).orElse("");
    }

    private static boolean inUnitRange(Double v) {
        return Double.isFinite(v) && v >= 0 && v <= 1;
    }
}

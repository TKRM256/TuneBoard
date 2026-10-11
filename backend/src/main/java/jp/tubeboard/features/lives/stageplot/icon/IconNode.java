package jp.tubeboard.features.lives.stageplot.icon;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * lucide アイコンを構成する SVG 要素 1 つ。JSON では lucide と同じ {@code ["path", {"d": "..."}]} の形。
 * 座標は 24×24 の viewBox 上の値。
 */
@JsonFormat(shape = JsonFormat.Shape.ARRAY)
public record IconNode(String tag, Map<String, Object> attrs) {

    public String attr(String name) {
        if (attrs == null) {
            return null;
        }
        Object value = attrs.get(name);
        return value == null ? null : value.toString();
    }

    public float number(String name, float fallback) {
        String value = attr(name);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        try {
            float parsed = Float.parseFloat(value.trim());
            return Float.isFinite(parsed) ? parsed : fallback;
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }
}

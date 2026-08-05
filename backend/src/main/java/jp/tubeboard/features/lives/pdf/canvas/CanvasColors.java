package jp.tubeboard.features.lives.pdf.canvas;

import java.awt.Color;

/** Parses the {@code #rrggbb} colours used throughout the canvas schema. */
public final class CanvasColors {

    private CanvasColors() {
    }

    public static Color parse(String hex, Color fallback) {
        if (hex == null || hex.isBlank()) {
            return fallback;
        }
        String value = hex.startsWith("#") ? hex.substring(1) : hex;
        try {
            if (value.length() == 6) {
                return new Color(Integer.parseInt(value.substring(0, 2), 16),
                        Integer.parseInt(value.substring(2, 4), 16),
                        Integer.parseInt(value.substring(4, 6), 16));
            }
        } catch (NumberFormatException ex) {
            // fall through to the fallback
        }
        return fallback;
    }
}

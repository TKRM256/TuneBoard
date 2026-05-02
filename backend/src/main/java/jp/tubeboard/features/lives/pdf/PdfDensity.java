package jp.tubeboard.features.lives.pdf;

/** Spacing density profile applied to padding/margins between blocks. */
public enum PdfDensity {
    COMPACT(0.7f),
    COMFORTABLE(1.0f),
    SPACIOUS(1.35f);

    private final float multiplier;

    PdfDensity(float multiplier) {
        this.multiplier = multiplier;
    }

    public float multiplier() {
        return multiplier;
    }
}

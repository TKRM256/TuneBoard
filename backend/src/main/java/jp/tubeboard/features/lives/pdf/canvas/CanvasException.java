package jp.tubeboard.features.lives.pdf.canvas;

/** Raised when a canvas document cannot be parsed or rendered. */
public class CanvasException extends RuntimeException {

    private final String elementId;

    public CanvasException(String message) {
        super(message);
        this.elementId = null;
    }

    public CanvasException(String message, String elementId) {
        super(message);
        this.elementId = elementId;
    }

    public CanvasException(String message, Throwable cause) {
        super(message, cause);
        this.elementId = null;
    }

    public String elementId() {
        return elementId;
    }
}

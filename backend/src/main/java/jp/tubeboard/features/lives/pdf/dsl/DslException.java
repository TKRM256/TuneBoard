package jp.tubeboard.features.lives.pdf.dsl;

/** Raised when YAML parsing or expression evaluation fails. Holds optional source coordinates. */
public class DslException extends RuntimeException {

    private final Integer line;
    private final Integer column;
    private final String path;

    public DslException(String message, Integer line, Integer column, String path) {
        super(message);
        this.line = line;
        this.column = column;
        this.path = path;
    }

    public DslException(String message, Throwable cause, Integer line, Integer column, String path) {
        super(message, cause);
        this.line = line;
        this.column = column;
        this.path = path;
    }

    public Integer line() {
        return line;
    }

    public Integer column() {
        return column;
    }

    public String path() {
        return path;
    }
}

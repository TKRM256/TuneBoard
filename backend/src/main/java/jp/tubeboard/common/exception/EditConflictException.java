package jp.tubeboard.common.exception;

/** 読み込んだあとに他の人が同じ設定を保存していたとき。黙って上書きせず 409 で知らせる。 */
public class EditConflictException extends RuntimeException {

    public EditConflictException(String message) {
        super(message);
    }
}

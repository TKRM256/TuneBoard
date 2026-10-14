package jp.tubeboard.features.lives.service.export;

/** ダウンロード用に生成したファイル本体と、拡張子を除いたファイル名。 */
public record ExportResult(byte[] bytes, String filenameStem) {
}

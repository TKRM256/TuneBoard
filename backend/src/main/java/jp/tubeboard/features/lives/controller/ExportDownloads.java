package jp.tubeboard.features.lives.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import jp.tubeboard.features.lives.service.export.ExportFiles;
import jp.tubeboard.features.lives.service.export.ExportResult;

/** 生成したファイルを添付ファイルとして返すレスポンスを組み立てる。 */
final class ExportDownloads {

    static final MediaType ZIP = MediaType.parseMediaType("application/zip");

    private ExportDownloads() {
    }

    static ResponseEntity<byte[]> attachment(ExportResult result, String extension, MediaType mediaType) {
        String filename = ExportFiles.sanitizeStem(result.filenameStem()) + "." + extension;
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"download." + extension + "\"; filename*=UTF-8''" + encoded)
                .body(result.bytes());
    }
}

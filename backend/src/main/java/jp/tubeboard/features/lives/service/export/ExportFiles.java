package jp.tubeboard.features.lives.service.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * 出力ファイルの名前の整形と ZIP へのまとめ。PDF と会場書式の両方で同じ規則を使う。
 */
public final class ExportFiles {

    private static final int MAX_STEM_LENGTH = 80;

    private ExportFiles() {
    }

    /** ZIP の 1 エントリを書き出す処理。 */
    @FunctionalInterface
    public interface EntryWriter {
        void write(OutputStream out) throws IOException;
    }

    public record ZipSource(String filenameStem, String extension, EntryWriter writer) {
    }

    /** ファイル名に使えない文字を置き換え、長すぎる名前は切り詰める。空なら "submission"。 */
    public static String sanitizeStem(String stem) {
        if (stem == null || stem.isBlank()) {
            return "submission";
        }
        String cleaned = stem.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", "_").trim();
        return cleaned.length() > MAX_STEM_LENGTH ? cleaned.substring(0, MAX_STEM_LENGTH) : cleaned;
    }

    /** 同じ名前が既にあれば "_2", "_3" … を付けて重複しない名前にする。 */
    public static String uniqueFilename(String name, Set<String> used) {
        if (used.add(name)) {
            return name;
        }
        int dot = name.lastIndexOf('.');
        String stem = dot >= 0 ? name.substring(0, dot) : name;
        String ext = dot >= 0 ? name.substring(dot) : "";
        int counter = 2;
        String candidate;
        do {
            candidate = stem + "_" + counter + ext;
            counter++;
        } while (!used.add(candidate));
        return candidate;
    }

    public static byte[] zip(List<ZipSource> sources) throws IOException {
        Set<String> usedNames = new HashSet<>();
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (ZipSource source : sources) {
                String filename = uniqueFilename(sanitizeStem(source.filenameStem()) + "." + source.extension(),
                        usedNames);
                zos.putNextEntry(new ZipEntry(filename));
                source.writer().write(zos);
                zos.closeEntry();
            }
            zos.finish();
            return baos.toByteArray();
        }
    }
}

package jp.tubeboard.common.model;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 保存した内容から作る短い版の印。画面は読み込んだときの印を保存のときに送り返し、
 * 印が今の内容と違えば、その間に他の人が保存したと分かる。
 */
public final class Revisions {

    private Revisions() {
    }

    public static String of(String... parts) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (String part : parts) {
                digest.update((part == null ? "" : part).getBytes(StandardCharsets.UTF_8));
                digest.update((byte) 0);
            }
            return HexFormat.of().formatHex(digest.digest(), 0, 8);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** 送られた印が空なら確かめない（古い画面からの保存）。 */
    public static boolean conflicts(String baseRevision, String currentRevision) {
        return baseRevision != null && !baseRevision.isBlank() && !baseRevision.equals(currentRevision);
    }
}

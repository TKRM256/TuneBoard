package jp.tubeboard.features.lives.dto.response;

import java.util.List;
import java.util.UUID;

public record SongDuplicateResponse(
                int totalDuplicateGroups,
                List<DuplicateGroup> groups) {

        /**
         * 確信度:
         * HIGH — 同一iTunesトラックID
         * MEDIUM — タイトル部分一致や読み仮名一致でマージ
         * LOW — ローカル正規化のみ
         */
        public enum Confidence {
                HIGH, MEDIUM, LOW
        }

        public record DuplicateGroup(
                        String normalizedTitle,
                        String normalizedArtist,
                        String itunesTrackId,
                        Confidence confidence,
                        boolean dismissed,
                        List<DuplicateSongEntry> entries) {
        }

        public record DuplicateSongEntry(
                        UUID submissionId,
                        String recordLabel,
                        String originalTitle,
                        String originalArtist) {
        }
}

package jp.tubeboard.features.lives.dto.response;

import java.util.List;
import java.util.UUID;

public record SongDuplicateResponse(
                int totalDuplicateGroups,
                List<DuplicateGroup> groups) {

        /**
         * 確信度:
         * HIGH — 同一MBID (MusicBrainz完全一致)
         * MEDIUM — 異なるMBID/ローカルキーだがタイトル部分一致でマージ
         * LOW — ローカル正規化のみ (MusicBrainz照合なし)
         */
        public enum Confidence {
                HIGH, MEDIUM, LOW
        }

        public record DuplicateGroup(
                        String normalizedTitle,
                        String normalizedArtist,
                        String mbid,
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

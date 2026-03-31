package jp.tubeboard.features.lives.dto.response;

import java.util.List;

public record PublicSongDuplicateCheckResponse(
        boolean hasDuplicate,
        List<DuplicateMatch> matches) {

    public record DuplicateMatch(
            String recordLabel,
            String songTitle,
            String songArtist) {
    }
}

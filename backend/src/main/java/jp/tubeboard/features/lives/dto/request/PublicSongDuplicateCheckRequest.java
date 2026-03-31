package jp.tubeboard.features.lives.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PublicSongDuplicateCheckRequest(
        @NotBlank String songTitle,
        String songArtist,
        String itunesTrackId,
        String itunesTitle,
        String itunesArtist) {
}

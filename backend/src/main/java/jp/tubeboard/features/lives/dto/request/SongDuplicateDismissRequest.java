package jp.tubeboard.features.lives.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SongDuplicateDismissRequest(
        @NotBlank String normalizedTitle) {
}

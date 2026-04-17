package jp.tubeboard.features.lives.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record LiveRestoreRequest(
        @NotNull(message = "ライブIDは必須です") UUID id) {
}

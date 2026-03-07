package jp.tubeboard.features.tenants.dto.requeest;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record TenantsUpdateRequest(
                @NotNull(message = "テナントIDは必須です") UUID id,
                @NotBlank(message = "テナント名は必須です") String name) {
}

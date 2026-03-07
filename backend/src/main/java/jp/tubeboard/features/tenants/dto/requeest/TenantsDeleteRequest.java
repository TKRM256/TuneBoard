package jp.tubeboard.features.tenants.dto.requeest;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record TenantsDeleteRequest(
        @NotNull(message = "テナントIDは必須です") UUID id) {
}

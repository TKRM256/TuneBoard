package jp.tubeboard.features.tenants.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record TenantsPurgeRequest(
        @NotNull(message = "テナントIDは必須です") UUID id) {
}

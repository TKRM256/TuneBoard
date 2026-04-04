package jp.tubeboard.features.tenants.dto.response;

import java.util.UUID;

import lombok.Builder;

@Builder
public record TenantResponse(UUID id, String name, String role) {

}

package jp.tubeboard.features.tenants.dto.response;

import lombok.Builder;

@Builder
public record TenantMemberResponse(
        Long userId,
        String name,
        String email,
        String picture,
        String role) {
}

package jp.tubeboard.features.tenants.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateTenantMemberRoleRequest(
        @NotBlank(message = "ロールは必須です") String role) {
}

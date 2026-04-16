package jp.tubeboard.features.tenants.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateInvitationRequest(
        @NotBlank String role) {
}

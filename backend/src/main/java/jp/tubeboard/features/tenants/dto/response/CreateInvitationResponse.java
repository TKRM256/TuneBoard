package jp.tubeboard.features.tenants.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record CreateInvitationResponse(
        UUID invitationId,
        String token,
        String role,
        LocalDateTime expiresAt) {
}

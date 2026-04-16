package jp.tubeboard.features.tenants.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record InvitationInfoResponse(
        UUID tenantId,
        String tenantName,
        String role,
        LocalDateTime expiresAt,
        boolean expired) {
}

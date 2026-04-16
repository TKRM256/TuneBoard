package jp.tubeboard.features.tenants.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.tenants.dto.request.CreateInvitationRequest;
import jp.tubeboard.features.tenants.dto.response.CreateInvitationResponse;
import jp.tubeboard.features.tenants.dto.response.InvitationInfoResponse;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.TenantInvitation;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantInvitationRepository;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TenantInvitationService {

    private static final int INVITATION_HOURS = 24;

    private final TenantInvitationRepository invitationRepository;
    private final TenantsRepository tenantsRepository;
    private final UserTenantRepository userTenantRepository;
    private final UserService userService;

    @Transactional
    public CreateInvitationResponse createInvitation(UUID tenantId, CreateInvitationRequest request) {
        requireAdmin(tenantId);
        TenantRole role = parseRole(request.role());
        if (role == TenantRole.OWNER) {
            throw new BadRequestException("OWNERロールの招待は作成できません");
        }

        Tenants tenant = tenantsRepository.findById(tenantId)
                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

        User currentUser = userService.getCurrentUser();
        String token = generateToken();
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(INVITATION_HOURS);

        TenantInvitation invitation = TenantInvitation.builder()
                .tenant(tenant)
                .token(token)
                .role(role)
                .createdBy(currentUser)
                .expiresAt(expiresAt)
                .build();

        TenantInvitation saved = invitationRepository.save(invitation);
        return new CreateInvitationResponse(saved.getId(), saved.getToken(), role.name(), expiresAt);
    }

    public InvitationInfoResponse getInvitationInfo(String token) {
        TenantInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("招待リンクが無効です"));

        boolean expired = LocalDateTime.now().isAfter(invitation.getExpiresAt());

        return new InvitationInfoResponse(
                invitation.getTenant().getId(),
                invitation.getTenant().getName(),
                invitation.getRole().name(),
                invitation.getExpiresAt(),
                expired);
    }

    @Transactional
    public void acceptInvitation(String token) {
        TenantInvitation invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("招待リンクが無効です"));

        if (LocalDateTime.now().isAfter(invitation.getExpiresAt())) {
            throw new BadRequestException("招待リンクの有効期限が切れています");
        }

        User currentUser = userService.getCurrentUser();
        UUID tenantId = invitation.getTenant().getId();

        if (userTenantRepository.existsByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, currentUser.getId())) {
            throw new BadRequestException("既にこのテナントのメンバーです");
        }

        userTenantRepository.save(UserTenant.builder()
                .user(currentUser)
                .tenant(invitation.getTenant())
                .role(invitation.getRole())
                .build());
    }

    private void requireAdmin(UUID tenantId) {
        User currentUser = userService.getCurrentUser();
        userTenantRepository.findByTenantIdAndUserIdAndDeletedAtIsNull(
                tenantId, currentUser.getId())
                .filter(ut -> ut.getRole().isAdminLevel())
                .orElseThrow(() -> new TenantsNotFoundException("管理者権限がありません"));
    }

    private TenantRole parseRole(String role) {
        try {
            return TenantRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("無効なロールです: " + role);
        }
    }

    private String generateToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }
}

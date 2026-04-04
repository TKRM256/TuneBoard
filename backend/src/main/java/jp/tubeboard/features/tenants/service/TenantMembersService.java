package jp.tubeboard.features.tenants.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.tenants.dto.request.AddTenantMemberRequest;
import jp.tubeboard.features.tenants.dto.request.UpdateTenantMemberRoleRequest;
import jp.tubeboard.features.tenants.dto.response.TenantMemberResponse;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.model.UserTenant;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;
import jp.tubeboard.common.exception.BadRequestException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TenantMembersService {

    private final UserTenantRepository userTenantRepository;
    private final TenantsRepository tenantsRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public List<TenantMemberResponse> listMembers(UUID tenantId) {
        requireMembership(tenantId);
        return userTenantRepository.findAllByTenantIdAndDeletedAtIsNull(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TenantMemberResponse addMember(UUID tenantId, AddTenantMemberRequest request) {
        requireAdmin(tenantId);

        TenantRole role = parseRole(request.role());
        Tenants tenant = tenantsRepository.findById(tenantId)
                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

        User targetUser = userRepository.findByEmailAndDeletedAtIsNull(request.email())
                .orElseThrow(() -> new BadRequestException("指定されたメールアドレスのユーザーが見つかりません"));

        if (userTenantRepository.existsByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, targetUser.getId())) {
            throw new BadRequestException("このユーザーは既にメンバーです");
        }

        UserTenant userTenant = userTenantRepository.save(UserTenant.builder()
                .user(targetUser)
                .tenant(tenant)
                .role(role)
                .build());

        return toResponse(userTenant);
    }

    @Transactional
    public void removeMember(UUID tenantId, Long targetUserId) {
        User currentUser = requireAdmin(tenantId);

        if (currentUser.getId().equals(targetUserId)) {
            throw new BadRequestException("自分自身を削除することはできません");
        }

        UserTenant userTenant = userTenantRepository
                .findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, targetUserId)
                .orElseThrow(() -> new TenantsNotFoundException("メンバーが見つかりません"));

        userTenant.markDeleted();
        userTenantRepository.save(userTenant);
    }

    @Transactional
    public TenantMemberResponse updateMemberRole(UUID tenantId, Long targetUserId,
            UpdateTenantMemberRoleRequest request) {
        User currentUser = requireAdmin(tenantId);
        TenantRole newRole = parseRole(request.role());

        if (currentUser.getId().equals(targetUserId)) {
            throw new BadRequestException("自分自身のロールは変更できません");
        }

        UserTenant userTenant = userTenantRepository
                .findByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, targetUserId)
                .orElseThrow(() -> new TenantsNotFoundException("メンバーが見つかりません"));

        userTenant.setRole(newRole);
        return toResponse(userTenantRepository.save(userTenant));
    }

    private User requireAdmin(UUID tenantId) {
        User currentUser = userService.getCurrentUser();
        userTenantRepository.findByTenantIdAndUserIdAndRoleAndDeletedAtIsNull(
                tenantId, currentUser.getId(), TenantRole.ADMIN)
                .orElseThrow(() -> new TenantsNotFoundException("管理者権限がありません"));
        return currentUser;
    }

    private void requireMembership(UUID tenantId) {
        User currentUser = userService.getCurrentUser();
        if (!userTenantRepository.existsByTenantIdAndUserIdAndDeletedAtIsNull(tenantId, currentUser.getId())) {
            throw new TenantsNotFoundException("テナントが見つかりません");
        }
    }

    private TenantMemberResponse toResponse(UserTenant ut) {
        User user = ut.getUser();
        return TenantMemberResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .picture(user.getPicture())
                .role(ut.getRole().name())
                .build();
    }

    private TenantRole parseRole(String role) {
        try {
            return TenantRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("無効なロールです: " + role);
        }
    }
}

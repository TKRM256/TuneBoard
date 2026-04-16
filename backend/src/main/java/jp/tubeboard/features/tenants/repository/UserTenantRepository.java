package jp.tubeboard.features.tenants.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.tenants.model.TenantRole;
import jp.tubeboard.features.tenants.model.UserTenant;

@Repository
public interface UserTenantRepository extends JpaRepository<UserTenant, UUID> {

    List<UserTenant> findAllByUserIdAndDeletedAtIsNull(Long userId);

    List<UserTenant> findAllByTenantIdAndDeletedAtIsNull(UUID tenantId);

    Optional<UserTenant> findByTenantIdAndUserIdAndDeletedAtIsNull(UUID tenantId, Long userId);

    boolean existsByTenantIdAndUserIdAndDeletedAtIsNull(UUID tenantId, Long userId);

    Optional<UserTenant> findByTenantIdAndUserIdAndRoleAndDeletedAtIsNull(
            UUID tenantId, Long userId, TenantRole role);
}

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

    void deleteAllByTenantId(UUID tenantId);

    Optional<UserTenant> findByTenantIdAndUserIdAndDeletedAtIsNull(UUID tenantId, Long userId);

    boolean existsByTenantIdAndUserIdAndDeletedAtIsNull(UUID tenantId, Long userId);

    /** (user_id, tenant_id) は一意なので、脱退済みの行も含めて1件だけ引ける。 */
    Optional<UserTenant> findByTenantIdAndUserId(UUID tenantId, Long userId);

    Optional<UserTenant> findByTenantIdAndUserIdAndRoleAndDeletedAtIsNull(
            UUID tenantId, Long userId, TenantRole role);
}

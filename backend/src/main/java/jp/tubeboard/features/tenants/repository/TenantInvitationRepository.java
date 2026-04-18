package jp.tubeboard.features.tenants.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.tenants.model.TenantInvitation;

@Repository
public interface TenantInvitationRepository extends JpaRepository<TenantInvitation, UUID> {

    Optional<TenantInvitation> findByToken(String token);

    void deleteAllByTenantId(UUID tenantId);
}

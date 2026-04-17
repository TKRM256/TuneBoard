package jp.tubeboard.features.tenants.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.tenants.model.Tenants;

@Repository
public interface TenantsRepository extends JpaRepository<Tenants, UUID> {
        public List<Tenants> findAllByUserIdAndDeletedAtIsNull(Long userId);

        public Optional<Tenants> findByIdAndUserIdAndDeletedAtIsNull(UUID id, Long userId);

        @Query("SELECT t FROM Tenants t JOIN UserTenant ut ON ut.tenant = t "
                        + "WHERE ut.user.id = :userId AND t.deletedAt IS NULL AND ut.deletedAt IS NULL")
        List<Tenants> findAllAccessibleByUserId(@Param("userId") Long userId);

        @Query("SELECT t FROM Tenants t JOIN UserTenant ut ON ut.tenant = t "
                        + "WHERE t.id = :tenantId AND ut.user.id = :userId "
                        + "AND t.deletedAt IS NULL AND ut.deletedAt IS NULL")
        Optional<Tenants> findByIdAndAccessibleByUserId(@Param("tenantId") UUID tenantId,
                        @Param("userId") Long userId);

        @Query("SELECT t FROM Tenants t JOIN UserTenant ut ON ut.tenant = t "
                        + "WHERE ut.user.id = :userId AND t.deletedAt IS NOT NULL "
                        + "AND t.deletedAt >= :cutoff AND ut.deletedAt IS NULL "
                        + "ORDER BY t.deletedAt DESC")
        List<Tenants> findAllTrashedAccessibleByUserId(@Param("userId") Long userId,
                        @Param("cutoff") LocalDateTime cutoff);

        @Query("SELECT t FROM Tenants t JOIN UserTenant ut ON ut.tenant = t "
                        + "WHERE t.id = :tenantId AND ut.user.id = :userId "
                        + "AND t.deletedAt IS NOT NULL AND ut.deletedAt IS NULL")
        Optional<Tenants> findTrashedByIdAndAccessibleByUserId(@Param("tenantId") UUID tenantId,
                        @Param("userId") Long userId);
}

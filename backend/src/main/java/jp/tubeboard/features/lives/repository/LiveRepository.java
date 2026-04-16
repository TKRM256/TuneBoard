package jp.tubeboard.features.lives.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.Live;

@Repository
public interface LiveRepository extends JpaRepository<Live, UUID> {

    List<Live> findAllByTenantUserIdAndDeletedAtIsNullOrderByDateAscCreatedAtDesc(Long userId);

    List<Live> findAllByTenantIdAndTenantUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID tenantId, Long userId);

    Optional<Live> findByIdAndTenantUserIdAndDeletedAtIsNull(UUID id, Long userId);

    Optional<Live> findByPublicTokenAndDeletedAtIsNull(String publicToken);

    @Query("SELECT l FROM Live l JOIN UserTenant ut ON ut.tenant = l.tenant "
            + "WHERE ut.user.id = :userId AND l.deletedAt IS NULL AND ut.deletedAt IS NULL "
            + "ORDER BY l.date ASC, l.createdAt DESC")
    List<Live> findAllAccessibleByUserId(@Param("userId") Long userId);

    @Query("SELECT l FROM Live l JOIN UserTenant ut ON ut.tenant = l.tenant "
            + "WHERE l.tenant.id = :tenantId AND ut.user.id = :userId "
            + "AND l.deletedAt IS NULL AND ut.deletedAt IS NULL "
            + "ORDER BY l.createdAt DESC")
    List<Live> findAllByTenantIdAndAccessibleByUserId(@Param("tenantId") UUID tenantId,
            @Param("userId") Long userId);

    @Query("SELECT l FROM Live l JOIN UserTenant ut ON ut.tenant = l.tenant "
            + "WHERE l.id = :id AND ut.user.id = :userId "
            + "AND l.deletedAt IS NULL AND ut.deletedAt IS NULL")
    Optional<Live> findByIdAndAccessibleByUserId(@Param("id") UUID id,
            @Param("userId") Long userId);
}
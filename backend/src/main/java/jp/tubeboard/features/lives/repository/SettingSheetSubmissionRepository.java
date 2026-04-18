package jp.tubeboard.features.lives.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.SettingSheetSubmission;

@Repository
public interface SettingSheetSubmissionRepository extends JpaRepository<SettingSheetSubmission, UUID> {

	Optional<SettingSheetSubmission> findByIdAndLivePublicTokenAndLiveDeletedAtIsNullAndDeletedAtIsNull(UUID id,
			String publicToken);

	List<SettingSheetSubmission> findAllByLivePublicTokenAndLiveDeletedAtIsNullAndDeletedAtIsNullOrderByCreatedAtDesc(
			String publicToken);

	List<SettingSheetSubmission> findAllByLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNullOrderByCreatedAtDesc(
			UUID liveId,
			Long userId);

	List<SettingSheetSubmission> findAllByLiveIdOrderByCreatedAtDesc(UUID liveId);

	void deleteAllByLiveId(UUID liveId);

	Optional<SettingSheetSubmission> findByIdAndLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNull(UUID id, UUID liveId,
			Long userId);

	List<SettingSheetSubmission> findAllByLiveIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID liveId);

	@Query("SELECT s FROM SettingSheetSubmission s JOIN UserTenant ut ON ut.tenant = s.live.tenant "
			+ "WHERE s.live.id = :liveId AND ut.user.id = :userId "
			+ "AND s.live.deletedAt IS NULL AND ut.deletedAt IS NULL AND s.deletedAt IS NULL "
			+ "ORDER BY s.createdAt DESC")
	List<SettingSheetSubmission> findAllByLiveIdAndAccessibleByUserId(
			@Param("liveId") UUID liveId, @Param("userId") Long userId);

	@Query("SELECT s FROM SettingSheetSubmission s JOIN UserTenant ut ON ut.tenant = s.live.tenant "
			+ "WHERE s.id = :id AND s.live.id = :liveId AND ut.user.id = :userId "
			+ "AND s.live.deletedAt IS NULL AND ut.deletedAt IS NULL AND s.deletedAt IS NULL")
	Optional<SettingSheetSubmission> findByIdAndLiveIdAndAccessibleByUserId(
			@Param("id") UUID id, @Param("liveId") UUID liveId, @Param("userId") Long userId);

	@Query("SELECT s FROM SettingSheetSubmission s JOIN UserTenant ut ON ut.tenant = s.live.tenant "
			+ "WHERE s.live.id = :liveId AND ut.user.id = :userId "
			+ "AND s.live.deletedAt IS NULL AND ut.deletedAt IS NULL AND s.deletedAt IS NOT NULL "
			+ "AND s.deletedAt >= :cutoff "
			+ "ORDER BY s.deletedAt DESC")
	List<SettingSheetSubmission> findAllTrashedByLiveIdAndAccessibleByUserId(
			@Param("liveId") UUID liveId, @Param("userId") Long userId, @Param("cutoff") LocalDateTime cutoff);

	@Query("SELECT s FROM SettingSheetSubmission s JOIN UserTenant ut ON ut.tenant = s.live.tenant "
			+ "WHERE s.id = :id AND s.live.id = :liveId AND ut.user.id = :userId "
			+ "AND s.live.deletedAt IS NULL AND ut.deletedAt IS NULL AND s.deletedAt IS NOT NULL")
	Optional<SettingSheetSubmission> findTrashedByIdAndLiveIdAndAccessibleByUserId(
			@Param("id") UUID id, @Param("liveId") UUID liveId, @Param("userId") Long userId);
}

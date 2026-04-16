package jp.tubeboard.features.lives.repository;

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

	Optional<SettingSheetSubmission> findByIdAndLivePublicTokenAndLiveDeletedAtIsNull(UUID id, String publicToken);

	List<SettingSheetSubmission> findAllByLivePublicTokenAndLiveDeletedAtIsNullOrderByCreatedAtDesc(String publicToken);

	List<SettingSheetSubmission> findAllByLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNullOrderByCreatedAtDesc(
			UUID liveId,
			Long userId);

	Optional<SettingSheetSubmission> findByIdAndLiveIdAndLiveTenantUserIdAndLiveDeletedAtIsNull(UUID id, UUID liveId,
			Long userId);

	List<SettingSheetSubmission> findAllByLiveIdOrderByCreatedAtDesc(UUID liveId);

	@Query("SELECT s FROM SettingSheetSubmission s JOIN UserTenant ut ON ut.tenant = s.live.tenant "
			+ "WHERE s.live.id = :liveId AND ut.user.id = :userId "
			+ "AND s.live.deletedAt IS NULL AND ut.deletedAt IS NULL "
			+ "ORDER BY s.createdAt DESC")
	List<SettingSheetSubmission> findAllByLiveIdAndAccessibleByUserId(
			@Param("liveId") UUID liveId, @Param("userId") Long userId);

	@Query("SELECT s FROM SettingSheetSubmission s JOIN UserTenant ut ON ut.tenant = s.live.tenant "
			+ "WHERE s.id = :id AND s.live.id = :liveId AND ut.user.id = :userId "
			+ "AND s.live.deletedAt IS NULL AND ut.deletedAt IS NULL")
	Optional<SettingSheetSubmission> findByIdAndLiveIdAndAccessibleByUserId(
			@Param("id") UUID id, @Param("liveId") UUID liveId, @Param("userId") Long userId);
}
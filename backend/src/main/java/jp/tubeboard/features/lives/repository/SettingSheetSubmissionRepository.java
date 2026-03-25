package jp.tubeboard.features.lives.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
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
}
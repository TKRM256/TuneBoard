package jp.tubeboard.features.lives.asset;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LiveAssetRepository extends JpaRepository<LiveAsset, UUID> {

    Optional<LiveAsset> findByIdAndLiveIdAndPurposeAndDeletedAtIsNull(UUID id, UUID liveId,
            LiveAssetPurpose purpose);

    List<LiveAsset> findAllByLiveIdAndPurposeAndDeletedAtIsNullOrderByCreatedAtAsc(UUID liveId,
            LiveAssetPurpose purpose);
}

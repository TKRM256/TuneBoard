package jp.tubeboard.features.lives.venueform.lines;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LiveAssetPageLinesRepository extends JpaRepository<LiveAssetPageLines, UUID> {

    Optional<LiveAssetPageLines> findByAssetIdAndPageIndex(UUID assetId, int pageIndex);
}

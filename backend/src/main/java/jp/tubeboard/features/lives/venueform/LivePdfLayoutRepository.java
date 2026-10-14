package jp.tubeboard.features.lives.venueform;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LivePdfLayoutRepository extends JpaRepository<LivePdfLayout, UUID> {

    List<LivePdfLayout> findByLiveIdAndDeletedAtIsNullOrderBySortOrderAscCreatedAtAsc(UUID liveId);

    Optional<LivePdfLayout> findByIdAndLiveIdAndDeletedAtIsNull(UUID id, UUID liveId);

    long countByLiveIdAndDeletedAtIsNull(UUID liveId);
}

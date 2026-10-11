package jp.tubeboard.features.lives.venueform;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LiveVenueFormRepository extends JpaRepository<LiveVenueForm, UUID> {

    Optional<LiveVenueForm> findByLiveIdAndDeletedAtIsNull(UUID liveId);
}

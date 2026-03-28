package jp.tubeboard.features.lives.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.MusicBrainzCacheEntry;

@Repository
public interface MusicBrainzCacheRepository extends JpaRepository<MusicBrainzCacheEntry, UUID> {

    Optional<MusicBrainzCacheEntry> findByNormalizedTitleAndNormalizedArtist(
            String normalizedTitle, String normalizedArtist);
}

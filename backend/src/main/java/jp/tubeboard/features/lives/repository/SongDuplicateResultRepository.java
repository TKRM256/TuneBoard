package jp.tubeboard.features.lives.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.SongDuplicateResult;

@Repository
public interface SongDuplicateResultRepository extends JpaRepository<SongDuplicateResult, UUID> {

    Optional<SongDuplicateResult> findByLiveId(UUID liveId);
}

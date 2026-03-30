package jp.tubeboard.features.lives.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.ItunesTrackLink;

@Repository
public interface ItunesTrackLinkRepository extends JpaRepository<ItunesTrackLink, UUID> {

    List<ItunesTrackLink> findAllBySubmissionId(UUID submissionId);

    List<ItunesTrackLink> findAllBySubmissionIdIn(List<UUID> submissionIds);

    Optional<ItunesTrackLink> findBySubmissionIdAndSongTitleAndSongArtist(
            UUID submissionId, String songTitle, String songArtist);

    void deleteAllBySubmissionId(UUID submissionId);
}

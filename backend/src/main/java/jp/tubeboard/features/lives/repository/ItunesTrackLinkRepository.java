package jp.tubeboard.features.lives.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jp.tubeboard.features.lives.model.ItunesTrackLink;

@Repository
public interface ItunesTrackLinkRepository extends JpaRepository<ItunesTrackLink, UUID> {

    @Query("SELECT l FROM ItunesTrackLink l WHERE l.submission.id = :submissionId AND l.deletedAt IS NULL")
    List<ItunesTrackLink> findAllBySubmissionId(@Param("submissionId") UUID submissionId);

    @Query("SELECT l FROM ItunesTrackLink l WHERE l.submission.id IN :submissionIds AND l.deletedAt IS NULL")
    List<ItunesTrackLink> findAllBySubmissionIdIn(@Param("submissionIds") List<UUID> submissionIds);

    @Query("SELECT l FROM ItunesTrackLink l WHERE l.submission.id = :submissionId AND l.songTitle = :songTitle AND l.songArtist = :songArtist AND l.deletedAt IS NULL")
    Optional<ItunesTrackLink> findBySubmissionIdAndSongTitleAndSongArtist(
            @Param("submissionId") UUID submissionId,
            @Param("songTitle") String songTitle,
            @Param("songArtist") String songArtist);

    @Modifying
    @Query("UPDATE ItunesTrackLink l SET l.deletedAt = CURRENT_TIMESTAMP WHERE l.submission.id = :submissionId AND l.deletedAt IS NULL")
    void deleteAllBySubmissionId(@Param("submissionId") UUID submissionId);
}

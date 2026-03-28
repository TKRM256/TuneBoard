package jp.tubeboard.features.lives.model;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table(name = "musicbrainz_cache")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class MusicBrainzCacheEntry {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "normalized_title", nullable = false, length = 500)
    private String normalizedTitle;

    @Column(name = "normalized_artist", nullable = false, length = 500)
    private String normalizedArtist;

    @Column(name = "found", nullable = false)
    private boolean found;

    @Column(name = "mbid", length = 100)
    private String mbid;

    @Column(name = "mb_title", length = 500)
    private String mbTitle;

    @Column(name = "mb_artist", length = 500)
    private String mbArtist;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreatedDate
    private LocalDateTime createdAt;
}

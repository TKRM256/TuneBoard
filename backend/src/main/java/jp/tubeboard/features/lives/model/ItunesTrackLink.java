package jp.tubeboard.features.lives.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jp.tubeboard.common.model.Audit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table(name = "itunes_track_links")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItunesTrackLink extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private SettingSheetSubmission submission;

    @Column(name = "song_title", nullable = false, length = 500)
    private String songTitle;

    @Column(name = "song_artist", nullable = false, length = 500)
    private String songArtist;

    @Column(name = "itunes_track_id", nullable = false, length = 100)
    private String itunesTrackId;

    @Column(name = "itunes_title", length = 500)
    private String itunesTitle;

    @Column(name = "itunes_artist", length = 500)
    private String itunesArtist;

    @Column(name = "itunes_album_art_url", length = 1000)
    private String itunesAlbumArtUrl;
}

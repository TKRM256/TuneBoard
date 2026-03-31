-- ==============================================
-- V8: Remove MusicBrainz cache, add Spotify track links
-- ==============================================

DROP TABLE IF EXISTS musicbrainz_cache;

CREATE TABLE spotify_track_links (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL,
    song_title VARCHAR(500) NOT NULL,
    song_artist VARCHAR(500) NOT NULL,
    spotify_track_id VARCHAR(100) NOT NULL,
    spotify_title VARCHAR(500),
    spotify_artist VARCHAR(500),
    spotify_album_art_url VARCHAR(1000),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_spotify_track_links_submission FOREIGN KEY (submission_id) REFERENCES setting_sheet_submissions (id) ON DELETE CASCADE
);

CREATE INDEX idx_spotify_track_links_submission ON spotify_track_links (submission_id);

CREATE INDEX idx_spotify_track_links_track_id ON spotify_track_links (spotify_track_id);

CREATE UNIQUE INDEX idx_spotify_track_links_unique ON spotify_track_links (
    submission_id,
    song_title,
    song_artist
);
-- ==============================================
-- V6: create song duplicate cache tables
-- ==============================================

CREATE TABLE musicbrainz_cache (
    id UUID PRIMARY KEY,
    normalized_title VARCHAR(500) NOT NULL,
    normalized_artist VARCHAR(500) NOT NULL,
    found BOOLEAN NOT NULL,
    mbid VARCHAR(100),
    mb_title VARCHAR(500),
    mb_artist VARCHAR(500),
    created_at TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX idx_musicbrainz_cache_lookup ON musicbrainz_cache (
    normalized_title,
    normalized_artist
);

CREATE TABLE song_duplicate_results (
    id UUID PRIMARY KEY,
    live_id UUID NOT NULL UNIQUE,
    result_json TEXT NOT NULL,
    computed_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_song_duplicate_results_live FOREIGN KEY (live_id) REFERENCES lives (id) ON DELETE CASCADE
);
-- ==============================================
-- V10: Add audit columns (updated_at, deleted_at) to tables
--      missing them, and created_at where absent.
--      Replace unique index with non-unique for soft delete.
-- ==============================================

-- itunes_track_links: already has created_at, add updated_at and deleted_at
ALTER TABLE itunes_track_links
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE itunes_track_links ADD COLUMN deleted_at TIMESTAMP;

-- Drop the old unique index that conflicts with soft delete
DROP INDEX IF EXISTS idx_spotify_track_links_unique;

-- song_duplicate_results: has none of the audit columns
ALTER TABLE song_duplicate_results
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE song_duplicate_results
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE song_duplicate_results ADD COLUMN deleted_at TIMESTAMP;
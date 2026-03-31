-- ==============================================
-- V9: Rename Spotify track links to iTunes track links
-- ==============================================

ALTER TABLE spotify_track_links RENAME TO itunes_track_links;

ALTER TABLE itunes_track_links
RENAME COLUMN spotify_track_id TO itunes_track_id;

ALTER TABLE itunes_track_links
RENAME COLUMN spotify_title TO itunes_title;

ALTER TABLE itunes_track_links
RENAME COLUMN spotify_artist TO itunes_artist;

ALTER TABLE itunes_track_links
RENAME COLUMN spotify_album_art_url TO itunes_album_art_url;
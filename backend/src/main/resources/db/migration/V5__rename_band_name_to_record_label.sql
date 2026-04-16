-- ==============================================
-- V5: rename band_name column to record_label
-- ==============================================

ALTER TABLE setting_sheet_submissions
RENAME COLUMN band_name TO record_label;
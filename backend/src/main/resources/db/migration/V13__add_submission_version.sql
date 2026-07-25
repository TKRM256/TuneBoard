-- ==============================================
-- V13: Add optimistic locking version to setting_sheet_submissions
--      so concurrent edits of the same public submission can be
--      detected instead of silently overwriting each other.
-- ==============================================

ALTER TABLE setting_sheet_submissions
ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

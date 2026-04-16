-- ==============================================
-- V4: create setting sheet submissions table
-- ==============================================

CREATE TABLE setting_sheet_submissions (
    id UUID PRIMARY KEY,
    live_id UUID NOT NULL,
    band_name VARCHAR(255) NOT NULL,
    submission_status VARCHAR(40) NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

ALTER TABLE setting_sheet_submissions
ADD CONSTRAINT fk_setting_sheet_submissions_live FOREIGN KEY (live_id) REFERENCES lives (id);

CREATE INDEX idx_setting_sheet_submissions_live_id ON setting_sheet_submissions (live_id);
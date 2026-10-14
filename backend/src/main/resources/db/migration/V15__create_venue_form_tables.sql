-- ==============================================
-- V15: Venue forms (a venue's own setting-sheet format used as the PDF
--      background) and the files they are drawn on.
--      live_assets keeps uploaded files in the database because Cloud Run
--      has no persistent disk. purpose separates venue-form backgrounds
--      from stage-plot base images.
-- ==============================================

CREATE TABLE live_assets (
    id UUID PRIMARY KEY,
    live_id UUID NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    content BYTEA NOT NULL,
    size_bytes BIGINT NOT NULL,
    meta_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_live_assets_live FOREIGN KEY (live_id) REFERENCES lives (id) ON DELETE CASCADE
);

CREATE INDEX idx_live_assets_live_id ON live_assets (live_id);

CREATE TABLE live_venue_forms (
    id UUID PRIMARY KEY,
    live_id UUID NOT NULL UNIQUE,
    layout_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_live_venue_forms_live FOREIGN KEY (live_id) REFERENCES lives (id) ON DELETE CASCADE
);

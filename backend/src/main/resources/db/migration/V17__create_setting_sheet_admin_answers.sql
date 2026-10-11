-- ==============================================
-- V17: Answers to organizer-only questions (e.g. running order).
--      Kept apart from setting_sheet_submissions so that an organizer's
--      edit does not bump the submission's optimistic-lock version and
--      cause a false conflict for the performer editing the same sheet.
-- ==============================================

CREATE TABLE setting_sheet_admin_answers (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL UNIQUE,
    answers_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_setting_sheet_admin_answers_submission FOREIGN KEY (submission_id)
        REFERENCES setting_sheet_submissions (id) ON DELETE CASCADE
);

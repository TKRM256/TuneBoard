-- ==============================================
-- V16: Stage plot settings per live (base image and the icon palette
--      performers place on it).
-- ==============================================

ALTER TABLE lives
ADD COLUMN stage_plot_json TEXT;

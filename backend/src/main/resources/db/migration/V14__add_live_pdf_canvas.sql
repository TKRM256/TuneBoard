-- ==============================================
-- V14: Store the PDF canvas layout per live.
--      Until now the layout only lived in the browser's localStorage under a
--      single shared key, so it could not be reused across lives or shared
--      between organizers. Persisting it here makes "copy the PDF layout from
--      another live" possible.
-- ==============================================

ALTER TABLE lives
ADD COLUMN pdf_canvas_json TEXT;

-- ==============================================
-- V20: PDF 出力のレイアウトと会場書式を「PDF 書式」にまとめ、1 つのライブに複数持てるようにする。
--      format は layout_json の形。
--        CANVAS_V1 … 統合前の PDF レイアウト（lives.pdf_canvas_json）。読み込むときに今の形へ直し、保存し直すと V2 になる
--        V2        … 今の形（ページと要素の一覧）
--      lives.pdf_canvas_json は移した元として残しておく（もう読み書きしない）。
--      live_venue_forms は本番に出る前の表なので、移したあと消す。
-- ==============================================

CREATE TABLE live_pdf_layouts (
    id UUID PRIMARY KEY,
    live_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    format VARCHAR(20) NOT NULL,
    layout_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_live_pdf_layouts_live FOREIGN KEY (live_id) REFERENCES lives (id) ON DELETE CASCADE
);

CREATE INDEX idx_live_pdf_layouts_live_id ON live_pdf_layouts (live_id);

-- ライブ 1 件に 1 つだった PDF レイアウト。ID はライブの ID をそのまま使う（ほかに重なる ID は無い）
INSERT INTO live_pdf_layouts (id, live_id, name, sort_order, format, layout_json)
SELECT id, id, '標準', 0, 'CANVAS_V1', pdf_canvas_json
FROM lives
WHERE pdf_canvas_json IS NOT NULL AND TRIM(pdf_canvas_json) <> '';

INSERT INTO live_pdf_layouts (id, live_id, name, sort_order, format, layout_json, created_at, updated_at)
SELECT id, live_id, '会場書式', 1, 'V2', layout_json, created_at, updated_at
FROM live_venue_forms
WHERE deleted_at IS NULL;

DROP TABLE live_venue_forms;

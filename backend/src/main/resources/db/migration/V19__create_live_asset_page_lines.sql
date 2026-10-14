-- 会場書式の背景から検出した罫線。背景ファイルの中身は変わらないので、ページごとに一度だけ検出して保存する。
-- algorithm_version が今の検出方法と違う行は、次に読むときに検出し直す。
CREATE TABLE live_asset_page_lines (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL,
    page_index INT NOT NULL,
    algorithm_version INT NOT NULL,
    lines_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_live_asset_page_lines_asset FOREIGN KEY (asset_id) REFERENCES live_assets (id) ON DELETE CASCADE,
    CONSTRAINT uq_live_asset_page_lines UNIQUE (asset_id, page_index)
);

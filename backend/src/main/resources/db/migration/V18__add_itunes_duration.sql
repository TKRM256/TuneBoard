-- iTunes で選んだ曲の長さ（ミリ秒）。演奏時間の概算に使う。古いリンクは NULL のまま
ALTER TABLE itunes_track_links ADD COLUMN itunes_duration_ms BIGINT;

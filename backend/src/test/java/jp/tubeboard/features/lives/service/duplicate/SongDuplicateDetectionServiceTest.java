package jp.tubeboard.features.lives.service.duplicate;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class SongDuplicateDetectionServiceTest {

    @Test
    void normalize_basic() {
        assertEquals("hello world", SongDuplicateDetectionService.normalize("  Hello   World  "));
    }

    @Test
    void normalize_fullWidthToHalfWidth() {
        // NFKC normalizes full-width alphanumeric to half-width
        assertEquals("abc123", SongDuplicateDetectionService.normalize("ＡＢＣ１２３"));
    }

    @Test
    void normalize_nullAndBlank() {
        assertEquals("", SongDuplicateDetectionService.normalize(null));
        assertEquals("", SongDuplicateDetectionService.normalize(""));
        assertEquals("", SongDuplicateDetectionService.normalize("   "));
    }

    @Test
    void toReading_kanjiToHiragana() {
        // 漢字 → ひらがな読みに変換
        String reading = SongDuplicateDetectionService.toReading("夏祭り");
        assertEquals("なつまつり", reading);
    }

    @Test
    void toReading_alreadyHiragana() {
        // 既にひらがなならそのまま
        String reading = SongDuplicateDetectionService.toReading("なつまつり");
        assertEquals("なつまつり", reading);
    }

    @Test
    void toReading_kanjiAndHiraganaSame() {
        // 漢字表記とひらがな表記で同じ読みになることを確認
        String kanjiReading = SongDuplicateDetectionService.toReading("夏祭り");
        String hiraganaReading = SongDuplicateDetectionService.toReading("なつまつり");
        assertEquals(kanjiReading, hiraganaReading);
    }

    @Test
    void toReading_katakanaConversion() {
        // カタカナ → ひらがなに変換される
        String reading = SongDuplicateDetectionService.toReading("ナツマツリ");
        assertEquals("なつまつり", reading);
    }

    @Test
    void toReading_nullAndBlank() {
        assertEquals("", SongDuplicateDetectionService.toReading(null));
        assertEquals("", SongDuplicateDetectionService.toReading(""));
        assertEquals("", SongDuplicateDetectionService.toReading("   "));
    }

    @Test
    void toReading_mixedScript() {
        // 漢字+カタカナ混在のアーティスト名
        String reading = SongDuplicateDetectionService.toReading("スピッツ");
        assertFalse(reading.isEmpty());
    }

    @Test
    void toReading_englishPassthrough() {
        // 英語はそのまま通過
        String reading = SongDuplicateDetectionService.toReading("Yesterday");
        assertEquals("yesterday", reading);
    }
}

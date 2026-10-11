package jp.tubeboard.features.lives.export.context;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.ItunesLinkResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.service.ItunesDuration;

class SongApproxMinutesTest {

    private static final LayoutResponse LAYOUT = new LayoutResponse("full", 1, false);

    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();

    @Test
    void 曲の長さを分単位に切り上げる() {
        assertThat(ItunesDuration.approxMinutes(180_000L)).isEqualTo(3);
        // 秒未満は iTunes の表示（3:00）に合わせて切り捨てる
        assertThat(ItunesDuration.approxMinutes(180_900L)).isEqualTo(3);
        assertThat(ItunesDuration.approxMinutes(181_000L)).isEqualTo(4);
        assertThat(ItunesDuration.approxMinutes(239_000L)).isEqualTo(4);
        assertThat(ItunesDuration.approxMinutes(null)).isNull();
        assertThat(ItunesDuration.approxMinutes(-1L)).isNull();
    }

    @Test
    void 範囲外の長さは保存しない() {
        assertThat(ItunesDuration.sanitizeMillis(0L)).isNull();
        assertThat(ItunesDuration.sanitizeMillis(25L * 60 * 60 * 1000)).isNull();
        assertThat(ItunesDuration.sanitizeMillis(200_000L)).isEqualTo(200_000L);
    }

    @Test
    void iTunesで選んだ曲だけ演奏時間の概算を式で使える() {
        Map<String, Object> ns = CanvasContext.build(live(), config(), submission());

        assertThat(evaluator.interpolate("${groups['setlist'].items[0].field('song').approxMinutes}", ns))
                .isEqualTo("4");
        // 手入力の曲は長さが分からない
        assertThat(evaluator.interpolate("${groups['setlist'].items[1].field('song').approxMinutes == null}", ns))
                .isEqualTo("true");
        assertThat(evaluator.interpolate("${sumApproxMinutes(groups['setlist'], 'song')}", ns))
                .isEqualTo("7");
    }

    private static PublicSettingSheetSubmissionDetailResponse submission() {
        FieldAnswerResponse setlist = new FieldAnswerResponse("setlist", List.of(), List.of(
                item("白日", "King Gnu"),
                item("オリジナル曲", ""),
                // 大文字小文字や前後の空白が違っても、提出時に保存したリンクと対応づく
                item(" lemon ", "米津玄師")));
        List<ItunesLinkResponse> links = List.of(
                link("白日", "King Gnu", 181_000L),
                link("Lemon", "米津玄師", 175_000L));
        return new PublicSettingSheetSubmissionDetailResponse(UUID.randomUUID(), "Band", "完成",
                LocalDateTime.of(2026, 1, 1, 0, 0), LocalDateTime.of(2026, 1, 1, 0, 0), 0L,
                List.of(setlist), links);
    }

    private static GroupItemResponse item(String title, String artist) {
        List<String> values = artist.isEmpty() ? List.of(title) : List.of(title, artist);
        return new GroupItemResponse("default", List.of(new FieldAnswerResponse("song", values, List.of())));
    }

    private static ItunesLinkResponse link(String title, String artist, long durationMs) {
        return new ItunesLinkResponse(title, artist, "1", title, artist, null, durationMs);
    }

    private static SettingSheetConfigResponse config() {
        FormBlockResponse song = new FormBlockResponse("song", "SONG", "楽曲", "", false, true, true, false, false,
                "outline", "plain", List.of(), 0, "", "", "", List.of(), LAYOUT, null, "", List.of());
        FormBlockResponse setlist = new FormBlockResponse("setlist", "REPEATABLE_GROUP", "曲", "", false, true, true,
                false, true, "subtle", "outline", List.of(), 1, "追加", "曲", "", List.of(song), LAYOUT, null, "",
                List.of(new VariantResponse("default", "default", List.of(song))));
        return new SettingSheetConfigResponse("t", "", "送信", true, List.of(setlist));
    }

    private static LiveResponse live() {
        return new LiveResponse(UUID.randomUUID(), UUID.randomUUID(), "テナント", "tok", "ライブ",
                LocalDate.of(2026, 7, 1), "会場", LocalDateTime.of(2026, 6, 25, 18, 0), LiveStatus.PUBLISHED);
    }
}

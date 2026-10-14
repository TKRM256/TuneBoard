package jp.tubeboard.features.lives.export.context;

import java.util.List;
import java.util.Locale;

import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.ItunesLinkResponse;
import jp.tubeboard.features.lives.service.ItunesDuration;

/** 曲の回答（曲名・アーティスト）に対応する iTunes の曲を探し、演奏時間の概算（分）を返す。 */
final class SongDurations {

    private final List<ItunesLinkResponse> links;

    SongDurations(List<ItunesLinkResponse> links) {
        this.links = links == null ? List.of() : links;
    }

    /** iTunes で選ばれていない曲や、長さの分からない曲は null。 */
    Integer approxMinutes(FieldAnswerResponse answer) {
        if (answer == null || answer.values() == null || answer.values().isEmpty()) {
            return null;
        }
        // 提出時に曲名・アーティストをキーにリンクを保存しているので、同じ規則（前後空白・大文字小文字を無視）で引く
        String title = normalize(answer.values().get(0));
        String artist = normalize(answer.values().size() > 1 ? answer.values().get(1) : "");
        for (ItunesLinkResponse link : links) {
            if (normalize(link.songTitle()).equals(title) && normalize(link.songArtist()).equals(artist)) {
                return ItunesDuration.approxMinutes(link.itunesDurationMs());
            }
        }
        return null;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}

package jp.tubeboard.features.lives.dto.request;

import java.util.List;

public record PublicSettingSheetSubmissionRequest(
                List<FieldAnswerRequest> answers,
                List<ItunesLinkRequest> itunesLinks) {

        public record FieldAnswerRequest(
                        String fieldId,
                        List<String> values,
                        List<GroupItemRequest> items) {
        }

        public record GroupItemRequest(
                        String variantId,
                        List<FieldAnswerRequest> answers) {
        }

        public record ItunesLinkRequest(
                        String songTitle,
                        String songArtist,
                        String itunesTrackId,
                        String itunesTitle,
                        String itunesArtist,
                        String itunesAlbumArtUrl) {
        }
}
package jp.tubeboard.features.lives.dto.request;

import java.util.List;

import jakarta.validation.constraints.NotNull;

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
                        @NotNull String songTitle,
                        @NotNull String songArtist,
                        @NotNull String itunesTrackId,
                        String itunesTitle,
                        String itunesArtist,
                        String itunesAlbumArtUrl) {
        }
}
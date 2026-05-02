package jp.tubeboard.features.lives.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jp.tubeboard.features.lives.pdf.PdfLayoutOptions;

/** Body of the bulk PDF zip endpoint. */
public record SubmissionsZipRequest(
        @NotEmpty List<UUID> submissionIds,
        @Valid PdfGenerateRequest layout) {

    public PdfLayoutOptions toLayoutOptions() {
        return layout != null ? layout.toLayoutOptions() : PdfLayoutOptions.defaults();
    }
}

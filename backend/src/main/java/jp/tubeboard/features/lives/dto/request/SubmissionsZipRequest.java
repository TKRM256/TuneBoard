package jp.tubeboard.features.lives.dto.request;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.CanvasDocument;

/** Body of the bulk PDF zip endpoint. */
public record SubmissionsZipRequest(
        @NotEmpty List<UUID> submissionIds,
        CanvasDocument canvas) {
}

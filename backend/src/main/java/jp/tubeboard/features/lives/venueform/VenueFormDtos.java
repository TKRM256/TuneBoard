package jp.tubeboard.features.lives.venueform;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;

/** 会場書式 API の入出力。 */
public final class VenueFormDtos {

    private VenueFormDtos() {
    }

    /** @param document 未保存なら null */
    public record VenueFormResponse(VenueFormDocument document, List<LiveAssetResponse> assets) {
    }

    public record VenueFormUpdateRequest(VenueFormDocument document) {
    }

    /** 出力・確認用。document が無ければ保存済みの書式を使う。 */
    public record VenueFormRenderRequest(VenueFormDocument document) {
    }

    public record VenueFormZipRequest(@NotEmpty @Size(max = 200) List<UUID> submissionIds,
            VenueFormDocument document) {
    }

    public record VenueFormCheckRequest(UUID submissionId, VenueFormDocument document) {
    }

    public record VenueFormCheckResponse(List<String> warnings) {
    }

    public record CopyFromRequest(UUID sourceLiveId) {
    }
}

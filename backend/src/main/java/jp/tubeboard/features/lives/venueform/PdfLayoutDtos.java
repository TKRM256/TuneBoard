package jp.tubeboard.features.lives.venueform;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.lines.RuledLine;

/** PDF 書式 API の入出力。 */
public final class PdfLayoutDtos {

    private PdfLayoutDtos() {
    }

    public record LayoutSummary(UUID id, String name, int pageCount) {
    }

    /** @param revision 保存のときに送り返してもらう版の印 */
    public record LayoutResponse(UUID id, String name, VenueFormDocument document, List<LiveAssetResponse> assets,
            String revision) {
    }

    /** @param source {@code FORM}（フォームの項目を並べて作る）/ {@code BLANK}（白紙から） */
    public record LayoutCreateRequest(@NotBlank @Size(max = 100) String name, String source) {
    }

    /** @param baseRevision 読み込んだときの版の印。空なら他の人の保存と食い違っても確かめない */
    public record LayoutSaveRequest(@NotBlank @Size(max = 100) String name, VenueFormDocument document,
            String baseRevision) {
    }

    public record LayoutCopyRequest(UUID sourceLiveId, UUID sourceLayoutId) {
    }

    /** 出力に使う書式。document があればそれを、無ければ layoutId の保存済みの書式を、どちらも無ければフォームどおりの書式を使う。 */
    public record RenderRequest(UUID layoutId, VenueFormDocument document) {
    }

    public record ZipRequest(@NotEmpty @Size(max = 200) List<UUID> submissionIds, UUID layoutId,
            VenueFormDocument document) {
    }

    public record CheckRequest(UUID submissionId, UUID layoutId, VenueFormDocument document) {
    }

    public record CheckResponse(List<String> warnings) {
    }

    public record MeasureRequest(UUID submissionId, VenueFormDocument document) {
    }

    /** @param requiredHeightMm 見出しと全行を描くのに要る高さ */
    public record TableMeasurement(String elementId, float requiredHeightMm) {
    }

    public record MeasureResponse(List<TableMeasurement> tables) {
    }

    public record AssetsResponse(List<LiveAssetResponse> assets) {
    }

    /** 背景のページから検出した罫線。座標はページに対する比率。 */
    public record PageLinesResponse(List<RuledLine> lines) {
    }
}

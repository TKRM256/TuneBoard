package jp.tubeboard.features.lives.controller;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.AssetsResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.CheckRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.CheckResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutCopyRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutCreateRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutSaveRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.LayoutSummary;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.MeasureRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.MeasureResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.PageLinesResponse;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.RenderRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutDtos.ZipRequest;
import jp.tubeboard.features.lives.venueform.PdfLayoutPdfService;
import jp.tubeboard.features.lives.venueform.PdfLayoutService;
import jp.tubeboard.features.lives.venueform.lines.RuledLineService;
import lombok.AllArgsConstructor;

/** ライブの PDF 書式（会場の書式を背景にしたものも、白紙に並べたものも）の設定と出力。 */
@RestController
@RequestMapping("/api/lives/{id}/pdf-layouts")
@AllArgsConstructor
public class PdfLayoutController {

    private final PdfLayoutService layoutService;
    private final PdfLayoutPdfService pdfService;
    private final RuledLineService ruledLineService;

    @GetMapping
    public ResponseEntity<List<LayoutSummary>> list(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(layoutService.list(id));
    }

    @PostMapping
    public ResponseEntity<LayoutResponse> create(@PathVariable(name = "id") UUID id,
            @RequestBody @Valid LayoutCreateRequest request) {
        return ResponseEntity.ok(layoutService.create(id, request.name(), request.source()));
    }

    @PostMapping("/copy-from")
    public ResponseEntity<LayoutResponse> copyFrom(@PathVariable(name = "id") UUID id,
            @RequestBody LayoutCopyRequest request) {
        if (request.sourceLiveId() == null || request.sourceLayoutId() == null) {
            throw new BadRequestException("コピー元の書式を選んでください");
        }
        return ResponseEntity.ok(layoutService.copyFrom(id, request.sourceLiveId(), request.sourceLayoutId()));
    }

    @GetMapping("/{layoutId}")
    public ResponseEntity<LayoutResponse> get(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "layoutId") UUID layoutId) {
        return ResponseEntity.ok(layoutService.get(id, layoutId));
    }

    @PutMapping("/{layoutId}")
    public ResponseEntity<LayoutResponse> save(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "layoutId") UUID layoutId, @RequestBody @Valid LayoutSaveRequest request) {
        return ResponseEntity.ok(layoutService.save(id, layoutId, request.name(), request.document()));
    }

    @DeleteMapping("/{layoutId}")
    public ResponseEntity<Void> delete(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "layoutId") UUID layoutId) {
        layoutService.delete(id, layoutId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/check")
    public ResponseEntity<CheckResponse> check(@PathVariable(name = "id") UUID id,
            @RequestBody CheckRequest request) {
        if (request.submissionId() == null) {
            throw new BadRequestException("確認に使う提出を選んでください");
        }
        return ResponseEntity.ok(new CheckResponse(
                pdfService.check(id, request.submissionId(), request.layoutId(), request.document())));
    }

    @PostMapping("/measure")
    public ResponseEntity<MeasureResponse> measure(@PathVariable(name = "id") UUID id,
            @RequestBody MeasureRequest request) {
        if (request.submissionId() == null) {
            throw new BadRequestException("測るのに使う提出を選んでください");
        }
        return ResponseEntity.ok(new MeasureResponse(
                pdfService.measure(id, request.submissionId(), request.document())));
    }

    @PostMapping("/submissions/{submissionId}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId,
            @RequestBody(required = false) RenderRequest request) {
        return ExportDownloads.attachment(pdfService.generateOne(id, submissionId,
                request == null ? null : request.layoutId(), request == null ? null : request.document()),
                "pdf", MediaType.APPLICATION_PDF);
    }

    @PostMapping("/submissions/zip")
    public ResponseEntity<byte[]> downloadZip(@PathVariable(name = "id") UUID id,
            @RequestBody @Valid ZipRequest request) {
        return ExportDownloads.attachment(
                pdfService.generateZip(id, request.submissionIds(), request.layoutId(), request.document()),
                "zip", ExportDownloads.ZIP);
    }

    @GetMapping("/assets")
    public ResponseEntity<AssetsResponse> assets(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(new AssetsResponse(layoutService.listAssets(id)));
    }

    @PostMapping(value = "/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LiveAssetResponse> upload(@PathVariable(name = "id") UUID id,
            @RequestParam(name = "file") MultipartFile file) {
        return ResponseEntity.ok(layoutService.uploadAsset(id, file.getOriginalFilename(), readBytes(file)));
    }

    @GetMapping("/assets/{assetId}/pages/{pageIndex}")
    public ResponseEntity<byte[]> pagePreview(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "assetId") UUID assetId,
            @PathVariable(name = "pageIndex") int pageIndex,
            @RequestParam(name = "quality", defaultValue = "1") int quality) {
        LiveAsset asset = layoutService.findAsset(id, assetId);
        // ファイルは差し替えると別 ID になるので、同じ URL の中身は変わらない
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .contentType(MediaType.parseMediaType(layoutService.pagePreviewContentType(asset)))
                .body(layoutService.pagePreview(asset, pageIndex, quality));
    }

    /** 背景のページの罫線（あてふりの吸着・枠合わせ用）。 */
    @GetMapping("/assets/{assetId}/pages/{pageIndex}/lines")
    public ResponseEntity<PageLinesResponse> pageLines(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "assetId") UUID assetId,
            @PathVariable(name = "pageIndex") int pageIndex) {
        LiveAsset asset = layoutService.findAsset(id, assetId);
        layoutService.requirePage(asset, pageIndex);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(new PageLinesResponse(ruledLineService.linesFor(asset, pageIndex)));
    }

    static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("ファイルを読み込めませんでした");
        }
    }
}

package jp.tubeboard.features.lives.controller;

import java.io.IOException;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetResponse;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.CopyFromRequest;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormCheckRequest;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormCheckResponse;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormRenderRequest;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormResponse;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormUpdateRequest;
import jp.tubeboard.features.lives.venueform.VenueFormDtos.VenueFormZipRequest;
import jp.tubeboard.features.lives.venueform.VenueFormPdfService;
import jp.tubeboard.features.lives.venueform.VenueFormService;
import lombok.AllArgsConstructor;

/** 会場書式（会場の書式を背景にした PDF）の設定と出力。 */
@RestController
@RequestMapping("/api/lives/{id}/venue-form")
@AllArgsConstructor
public class VenueFormController {

    private final VenueFormService venueFormService;
    private final VenueFormPdfService venueFormPdfService;

    @GetMapping
    public ResponseEntity<VenueFormResponse> get(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(venueFormService.get(id));
    }

    @PostMapping
    public ResponseEntity<VenueFormResponse> save(@PathVariable(name = "id") UUID id,
            @RequestBody VenueFormUpdateRequest request) {
        return ResponseEntity.ok(venueFormService.save(id, request.document()));
    }

    @PostMapping(value = "/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LiveAssetResponse> upload(@PathVariable(name = "id") UUID id,
            @RequestParam(name = "file") MultipartFile file) {
        return ResponseEntity.ok(venueFormService.uploadAsset(id, file.getOriginalFilename(), readBytes(file)));
    }

    @GetMapping("/assets/{assetId}/pages/{pageIndex}")
    public ResponseEntity<byte[]> pagePreview(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "assetId") UUID assetId,
            @PathVariable(name = "pageIndex") int pageIndex) {
        LiveAsset asset = venueFormService.findAsset(id, assetId);
        // ファイルは差し替えると別 ID になるので、同じ URL の中身は変わらない
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePrivate())
                .contentType(MediaType.parseMediaType(venueFormService.pagePreviewContentType(asset)))
                .body(venueFormService.pagePreview(asset, pageIndex));
    }

    @PostMapping("/copy-from")
    public ResponseEntity<VenueFormResponse> copyFrom(@PathVariable(name = "id") UUID id,
            @RequestBody CopyFromRequest request) {
        if (request.sourceLiveId() == null) {
            throw new BadRequestException("コピー元のライブを選んでください");
        }
        return ResponseEntity.ok(venueFormService.copyFrom(id, request.sourceLiveId()));
    }

    @PostMapping("/check")
    public ResponseEntity<VenueFormCheckResponse> check(@PathVariable(name = "id") UUID id,
            @RequestBody VenueFormCheckRequest request) {
        if (request.submissionId() == null) {
            throw new BadRequestException("確認に使う提出を選んでください");
        }
        return ResponseEntity.ok(new VenueFormCheckResponse(
                venueFormPdfService.check(id, request.submissionId(), request.document())));
    }

    @PostMapping("/submissions/{submissionId}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId,
            @RequestBody(required = false) VenueFormRenderRequest request) {
        return ExportDownloads.attachment(
                venueFormPdfService.generateOne(id, submissionId, request == null ? null : request.document()),
                "pdf", MediaType.APPLICATION_PDF);
    }

    @PostMapping("/submissions/zip")
    public ResponseEntity<byte[]> downloadZip(@PathVariable(name = "id") UUID id,
            @RequestBody @Valid VenueFormZipRequest request) {
        return ExportDownloads.attachment(
                venueFormPdfService.generateZip(id, request.submissionIds(), request.document()),
                "zip", ExportDownloads.ZIP);
    }

    static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("ファイルを読み込めませんでした");
        }
    }
}

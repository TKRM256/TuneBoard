package jp.tubeboard.features.lives.controller;

import java.time.Duration;
import java.util.UUID;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.CopyFromRequest;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.StagePlotBaseFromVenueFormRequest;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.StagePlotResponse;
import jp.tubeboard.features.lives.stageplot.StagePlotDtos.StagePlotUpdateRequest;
import jp.tubeboard.features.lives.stageplot.StagePlotService;
import lombok.AllArgsConstructor;

/** ステージ配置図の設定（下絵・アイコンの一覧）。 */
@RestController
@RequestMapping("/api/lives/{id}/stage-plot")
@AllArgsConstructor
public class StagePlotController {

    private final StagePlotService stagePlotService;

    @GetMapping
    public ResponseEntity<StagePlotResponse> get(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(stagePlotService.get(id));
    }

    @PostMapping
    public ResponseEntity<StagePlotResponse> update(@PathVariable(name = "id") UUID id,
            @RequestBody StagePlotUpdateRequest request) {
        return ResponseEntity.ok(stagePlotService.update(id, request));
    }

    @PostMapping(value = "/base", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StagePlotResponse> uploadBase(@PathVariable(name = "id") UUID id,
            @RequestParam(name = "file") MultipartFile file) {
        return ResponseEntity.ok(stagePlotService.uploadBase(id, file.getOriginalFilename(),
                PdfLayoutController.readBytes(file)));
    }

    @PostMapping("/base/from-venue-form")
    public ResponseEntity<StagePlotResponse> baseFromVenueForm(@PathVariable(name = "id") UUID id,
            @RequestBody StagePlotBaseFromVenueFormRequest request) {
        return ResponseEntity.ok(stagePlotService.baseFromVenueForm(id, request));
    }

    @DeleteMapping("/base")
    public ResponseEntity<StagePlotResponse> deleteBase(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(stagePlotService.deleteBase(id));
    }

    @GetMapping("/base")
    public ResponseEntity<byte[]> baseImage(@PathVariable(name = "id") UUID id) {
        return image(stagePlotService.baseImage(id));
    }

    @PostMapping("/copy-from")
    public ResponseEntity<StagePlotResponse> copyFrom(@PathVariable(name = "id") UUID id,
            @RequestBody CopyFromRequest request) {
        if (request.sourceLiveId() == null) {
            throw new BadRequestException("コピー元のライブを選んでください");
        }
        return ResponseEntity.ok(stagePlotService.copyFrom(id, request.sourceLiveId()));
    }

    static ResponseEntity<byte[]> image(LiveAsset asset) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePrivate())
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .body(asset.getContent());
    }
}

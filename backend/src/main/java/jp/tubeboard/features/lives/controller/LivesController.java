package jp.tubeboard.features.lives.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.lives.dto.request.LiveCreateRequest;
import jp.tubeboard.features.lives.dto.request.LiveDeleteRequest;
import jp.tubeboard.features.lives.dto.request.LivePurgeRequest;
import jp.tubeboard.features.lives.dto.request.LiveRestoreRequest;
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.request.SongDuplicateDismissRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.dto.response.SongDuplicateResponse;
import jp.tubeboard.features.lives.service.crud.ILivesService;
import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/api/lives")
@AllArgsConstructor
public class LivesController {

    private final ILivesService livesService;

    @PostMapping("/create")
    public ResponseEntity<LiveResponse> create(@RequestBody @Valid LiveCreateRequest request) {
        return ResponseEntity.ok(livesService.create(request));
    }

    @GetMapping("/list")
    public ResponseEntity<List<LiveResponse>> list() {
        return ResponseEntity.ok(livesService.list());
    }

    @GetMapping("/tenant/{tenantId}/list")
    public ResponseEntity<List<LiveResponse>> listByTenant(@PathVariable(name = "tenantId") UUID tenantId) {
        return ResponseEntity.ok(livesService.listByTenant(tenantId));
    }

    @GetMapping("/tenant/{tenantId}/trash")
    public ResponseEntity<List<LiveResponse>> listTrashedByTenant(@PathVariable(name = "tenantId") UUID tenantId) {
        return ResponseEntity.ok(livesService.listTrashedByTenant(tenantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LiveResponse> get(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.get(id));
    }

    @PostMapping("/update")
    public ResponseEntity<LiveResponse> update(@RequestBody @Valid LiveUpdateRequest request) {
        return ResponseEntity.ok(livesService.update(request));
    }

    @PostMapping("/delete")
    public ResponseEntity<Void> delete(@RequestBody @Valid LiveDeleteRequest request) {
        livesService.delete(request.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/restore")
    public ResponseEntity<Void> restore(@RequestBody @Valid LiveRestoreRequest request) {
        livesService.restoreLive(request.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/purge")
    public ResponseEntity<Void> purge(@RequestBody @Valid LivePurgeRequest request) {
        livesService.purgeLive(request.id());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/setting-sheet/config/default")
    public ResponseEntity<SettingSheetConfigResponse> getDefaultSettingSheetConfig() {
        return ResponseEntity.ok(livesService.getDefaultSettingSheetConfig());
    }

    @GetMapping("/{id}/setting-sheet/config")
    public ResponseEntity<SettingSheetConfigResponse> getSettingSheetConfig(@PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.getSettingSheetConfig(id));
    }

    @PostMapping("/{id}/setting-sheet/config")
    public ResponseEntity<SettingSheetConfigResponse> updateSettingSheetConfig(
            @PathVariable(name = "id") UUID id,
            @RequestBody @Valid SettingSheetConfigUpdateRequest request) {
        return ResponseEntity.ok(livesService.updateSettingSheetConfig(id, request));
    }

    @GetMapping("/{id}/setting-sheet/submissions")
    public ResponseEntity<List<SettingSheetSubmissionResponse>> listSettingSheetSubmissions(
            @PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.listOwnedSettingSheetSubmissions(id));
    }

    @GetMapping("/{id}/setting-sheet/submissions/details")
    public ResponseEntity<List<PublicSettingSheetSubmissionDetailResponse>> listSettingSheetSubmissionDetails(
            @PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.listOwnedSettingSheetSubmissionDetails(id));
    }

    @GetMapping("/{id}/setting-sheet/submissions/trash")
    public ResponseEntity<List<SettingSheetSubmissionResponse>> listTrashedSubmissions(
            @PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.listTrashedSubmissions(id));
    }

    @GetMapping("/{id}/setting-sheet/submissions/{submissionId}")
    public ResponseEntity<PublicSettingSheetSubmissionDetailResponse> getSettingSheetSubmission(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId) {
        return ResponseEntity.ok(livesService.getOwnedSettingSheetSubmission(id, submissionId));
    }

    @PostMapping("/{id}/setting-sheet/submissions/{submissionId}/delete")
    public ResponseEntity<Void> deleteSubmission(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId) {
        livesService.deleteSubmission(id, submissionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/setting-sheet/submissions/{submissionId}/restore")
    public ResponseEntity<Void> restoreSubmission(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId) {
        livesService.restoreSubmission(id, submissionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/setting-sheet/submissions/{submissionId}/purge")
    public ResponseEntity<Void> purgeSubmission(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId) {
        livesService.purgeSubmission(id, submissionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/songs/duplicates")
    public ResponseEntity<SongDuplicateResponse> detectSongDuplicates(
            @PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.detectSongDuplicates(id));
    }

    @PostMapping("/{id}/songs/duplicates/refresh")
    public ResponseEntity<SongDuplicateResponse> refreshSongDuplicates(
            @PathVariable(name = "id") UUID id) {
        return ResponseEntity.ok(livesService.refreshSongDuplicates(id));
    }

    @PostMapping("/{id}/songs/duplicates/dismiss")
    public ResponseEntity<SongDuplicateResponse> dismissSongDuplicate(
            @PathVariable(name = "id") UUID id,
            @RequestBody @Valid SongDuplicateDismissRequest request) {
        return ResponseEntity.ok(livesService.toggleDismissSongDuplicate(id, request.normalizedTitle()));
    }
}

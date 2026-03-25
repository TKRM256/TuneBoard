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
import jp.tubeboard.features.lives.dto.request.LiveUpdateRequest;
import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
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

    @GetMapping("/{id}/setting-sheet/submissions/{submissionId}")
    public ResponseEntity<PublicSettingSheetSubmissionDetailResponse> getSettingSheetSubmission(
            @PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId) {
        return ResponseEntity.ok(livesService.getOwnedSettingSheetSubmission(id, submissionId));
    }
}
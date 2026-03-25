package jp.tubeboard.features.lives.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.response.PublicLiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionResponse;
import jp.tubeboard.features.lives.service.crud.ILivesService;
import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/api/public/lives")
@AllArgsConstructor
public class PublicLivesController {

    private final ILivesService livesService;

    @GetMapping("/{publicToken}")
    public ResponseEntity<PublicLiveResponse> findByPublicToken(
            @PathVariable(name = "publicToken") String publicToken) {
        return ResponseEntity.ok(livesService.findPublicLive(publicToken));
    }

    @PostMapping("/{publicToken}/setting-sheet/submissions")
    public ResponseEntity<SettingSheetSubmissionResponse> submit(
            @PathVariable(name = "publicToken") String publicToken,
            @RequestBody @Valid PublicSettingSheetSubmissionRequest request) {
        return ResponseEntity.ok(livesService.submitPublicSettingSheet(publicToken, request));
    }

    @GetMapping("/{publicToken}/setting-sheet/submissions/{submissionId}")
    public ResponseEntity<PublicSettingSheetSubmissionDetailResponse> findSubmission(
            @PathVariable(name = "publicToken") String publicToken,
            @PathVariable(name = "submissionId") UUID submissionId) {
        return ResponseEntity.ok(livesService.getPublicSettingSheetSubmission(publicToken, submissionId));
    }

    @GetMapping("/{publicToken}/setting-sheet/submissions/{submissionId}/shared")
    public ResponseEntity<PublicSettingSheetSubmissionDetailResponse> findSharedSubmission(
            @PathVariable(name = "publicToken") String publicToken,
            @PathVariable(name = "submissionId") UUID submissionId) {
        return ResponseEntity.ok(livesService.getPublicSharedSettingSheetSubmission(publicToken, submissionId));
    }

    @GetMapping("/{publicToken}/setting-sheet/submissions/shared")
    public ResponseEntity<java.util.List<PublicSettingSheetSubmissionDetailResponse>> listSharedSubmissions(
            @PathVariable(name = "publicToken") String publicToken) {
        return ResponseEntity.ok(livesService.listPublicSharedSettingSheetSubmissions(publicToken));
    }

    @PutMapping("/{publicToken}/setting-sheet/submissions/{submissionId}")
    public ResponseEntity<SettingSheetSubmissionResponse> updateSubmission(
            @PathVariable(name = "publicToken") String publicToken,
            @PathVariable(name = "submissionId") UUID submissionId,
            @RequestBody @Valid PublicSettingSheetSubmissionRequest request) {
        return ResponseEntity.ok(livesService.updatePublicSettingSheetSubmission(publicToken, submissionId, request));
    }
}
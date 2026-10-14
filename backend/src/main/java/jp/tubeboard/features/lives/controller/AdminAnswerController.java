package jp.tubeboard.features.lives.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.lives.adminanswer.AdminAnswerDtos.AdminAnswersResponse;
import jp.tubeboard.features.lives.adminanswer.AdminAnswerDtos.AdminAnswersUpdateRequest;
import jp.tubeboard.features.lives.adminanswer.AdminAnswerService;
import lombok.AllArgsConstructor;

/** 管理者だけが入力する項目（出順など）の保存。 */
@RestController
@RequestMapping("/api/lives/{id}/setting-sheet/submissions/{submissionId}/admin-answers")
@AllArgsConstructor
public class AdminAnswerController {

    private final AdminAnswerService adminAnswerService;

    @PostMapping
    public ResponseEntity<AdminAnswersResponse> update(@PathVariable(name = "id") UUID id,
            @PathVariable(name = "submissionId") UUID submissionId,
            @RequestBody @Valid AdminAnswersUpdateRequest request) {
        return ResponseEntity.ok(adminAnswerService.update(id, submissionId, request.answers()));
    }
}

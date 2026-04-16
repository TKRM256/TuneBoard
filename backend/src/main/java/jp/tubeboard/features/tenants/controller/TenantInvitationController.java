package jp.tubeboard.features.tenants.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.tenants.dto.request.CreateInvitationRequest;
import jp.tubeboard.features.tenants.dto.response.CreateInvitationResponse;
import jp.tubeboard.features.tenants.dto.response.InvitationInfoResponse;
import jp.tubeboard.features.tenants.service.TenantInvitationService;
import lombok.AllArgsConstructor;

@RestController
@AllArgsConstructor
public class TenantInvitationController {

    private final TenantInvitationService tenantInvitationService;

    /** 招待リンクを発行 (ADMIN のみ) */
    @PostMapping("/api/tenants/{tenantId}/invitations")
    public ResponseEntity<CreateInvitationResponse> create(
            @PathVariable(name = "tenantId") UUID tenantId,
            @RequestBody @Valid CreateInvitationRequest request) {
        return ResponseEntity.ok(tenantInvitationService.createInvitation(tenantId, request));
    }

    /** 招待情報を取得 (認証不要: 受け入れ画面表示用) */
    @GetMapping("/api/invitations/{token}")
    public ResponseEntity<InvitationInfoResponse> info(
            @PathVariable(name = "token") String token) {
        return ResponseEntity.ok(tenantInvitationService.getInvitationInfo(token));
    }

    /** 招待を受け入れる (認証必須) */
    @PostMapping("/api/invitations/{token}/accept")
    public ResponseEntity<Void> accept(
            @PathVariable(name = "token") String token) {
        tenantInvitationService.acceptInvitation(token);
        return ResponseEntity.noContent().build();
    }
}

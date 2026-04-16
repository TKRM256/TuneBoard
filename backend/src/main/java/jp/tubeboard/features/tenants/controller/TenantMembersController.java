package jp.tubeboard.features.tenants.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.tenants.dto.request.AddTenantMemberRequest;
import jp.tubeboard.features.tenants.dto.request.UpdateTenantMemberRoleRequest;
import jp.tubeboard.features.tenants.dto.response.TenantMemberResponse;
import jp.tubeboard.features.tenants.service.TenantMembersService;
import lombok.AllArgsConstructor;

@RestController
@RequestMapping("/api/tenants/{tenantId}/members")
@AllArgsConstructor
public class TenantMembersController {

    private final TenantMembersService tenantMembersService;

    @GetMapping
    public ResponseEntity<List<TenantMemberResponse>> list(
            @PathVariable(name = "tenantId") UUID tenantId) {
        return ResponseEntity.ok(tenantMembersService.listMembers(tenantId));
    }

    @PostMapping
    public ResponseEntity<TenantMemberResponse> add(
            @PathVariable(name = "tenantId") UUID tenantId,
            @RequestBody @Valid AddTenantMemberRequest request) {
        return ResponseEntity.ok(tenantMembersService.addMember(tenantId, request));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> remove(
            @PathVariable(name = "tenantId") UUID tenantId,
            @PathVariable(name = "userId") Long userId) {
        tenantMembersService.removeMember(tenantId, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{userId}/role")
    public ResponseEntity<TenantMemberResponse> updateRole(
            @PathVariable(name = "tenantId") UUID tenantId,
            @PathVariable(name = "userId") Long userId,
            @RequestBody @Valid UpdateTenantMemberRoleRequest request) {
        return ResponseEntity.ok(tenantMembersService.updateMemberRole(tenantId, userId, request));
    }
}

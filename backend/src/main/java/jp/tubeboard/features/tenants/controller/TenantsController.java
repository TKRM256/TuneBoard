package jp.tubeboard.features.tenants.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.tenants.dto.request.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsDeleteRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsPurgeRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsRestoreRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;
import jp.tubeboard.features.tenants.service.interfaces.ITenantsService;
import lombok.AllArgsConstructor;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/tenants")
@AllArgsConstructor
public class TenantsController {

    private final ITenantsService tenantsService;

    @PostMapping("/create")
    public ResponseEntity<TenantsCreateResponse> create(@RequestBody @Valid TenantsCreateRequest request) {
        final TenantsCreateResponse tenant = tenantsService.create(request);
        return ResponseEntity.ok(tenant);
    }

    @PostMapping("/update")
    public ResponseEntity<TenantsUpdateResponse> update(@RequestBody @Valid TenantsUpdateRequest request) {
        final TenantsUpdateResponse updatedTenant = tenantsService.update(request);
        return ResponseEntity.ok(updatedTenant);
    }

    @GetMapping("/list")
    public ResponseEntity<List<TenantResponse>> list() {
        final List<TenantResponse> tenants = tenantsService.list();
        return ResponseEntity.ok(tenants);
    }

    @GetMapping("/get/{tenantId}")
    public ResponseEntity<TenantResponse> get(@PathVariable(name = "tenantId") UUID tenantId) {
        final TenantResponse tenant = tenantsService.get(tenantId);
        return ResponseEntity.ok(tenant);
    }

    @PostMapping("/delete")
    public ResponseEntity<Void> delete(@RequestBody @Valid TenantsDeleteRequest request) {
        tenantsService.delete(request.id());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/trash")
    public ResponseEntity<List<TenantResponse>> listTrashed() {
        return ResponseEntity.ok(tenantsService.listTrashed());
    }

    @PostMapping("/restore")
    public ResponseEntity<Void> restore(@RequestBody @Valid TenantsRestoreRequest request) {
        tenantsService.restore(request.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/purge")
    public ResponseEntity<Void> purge(@RequestBody @Valid TenantsPurgeRequest request) {
        tenantsService.purge(request.id());
        return ResponseEntity.noContent().build();
    }

}

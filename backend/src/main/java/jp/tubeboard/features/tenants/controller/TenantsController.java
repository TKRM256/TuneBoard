package jp.tubeboard.features.tenants.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jp.tubeboard.features.tenants.dto.requeest.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.requeest.TenantsDeleteRequest;
import jp.tubeboard.features.tenants.dto.requeest.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;
import jp.tubeboard.features.tenants.service.interfaces.ITenantsService;
import lombok.AllArgsConstructor;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;

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
    public ResponseEntity<List<TenantsUpdateResponse>> list() {
        final List<TenantsUpdateResponse> tenants = tenantsService.list();
        return ResponseEntity.ok(tenants);
    }

    @PostMapping("/delete")
    public ResponseEntity<Void> delete(@RequestBody @Valid TenantsDeleteRequest request) {
        tenantsService.delete(request.id());
        return ResponseEntity.noContent().build();
    }

}

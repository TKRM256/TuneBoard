-- ==============================================
-- V12: tenant_invitations - invite link system
-- ==============================================

CREATE TABLE tenant_invitations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    token VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    created_by BIGINT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT uk_tenant_invitations_token UNIQUE (token),
    CONSTRAINT fk_tenant_invitations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    CONSTRAINT fk_tenant_invitations_user FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE INDEX idx_tenant_invitations_token ON tenant_invitations (token);

CREATE INDEX idx_tenant_invitations_tenant_id ON tenant_invitations (tenant_id);
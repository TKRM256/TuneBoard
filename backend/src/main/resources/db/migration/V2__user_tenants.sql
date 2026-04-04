-- ==============================================
-- V2: user_tenants – multi-member tenant access
-- ==============================================

CREATE TABLE user_tenants (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tenant_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT fk_user_tenants_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_tenants_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id),
    CONSTRAINT uk_user_tenants UNIQUE (user_id, tenant_id)
);

CREATE INDEX idx_user_tenants_user_id ON user_tenants (user_id);

CREATE INDEX idx_user_tenants_tenant_id ON user_tenants (tenant_id);

-- Migrate existing tenant owners as ADMIN
INSERT INTO
    user_tenants (
        id,
        user_id,
        tenant_id,
        role,
        created_at,
        updated_at
    )
SELECT RANDOM_UUID (), t.user_id, t.id, 'ADMIN', t.created_at, t.updated_at
FROM tenants t
WHERE
    t.user_id IS NOT NULL
    AND t.deleted_at IS NULL;
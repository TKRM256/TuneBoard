-- ==============================================
-- V3: create lives table
-- ==============================================

CREATE TABLE lives (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    public_token VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    date DATE,
    location VARCHAR(255),
    deadline_at TIMESTAMP NULL,
    status VARCHAR(40) NOT NULL,
    settings_json TEXT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

ALTER TABLE lives
ADD CONSTRAINT fk_lives_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id);
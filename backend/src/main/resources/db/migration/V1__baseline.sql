-- ==============================================
-- V1: TuneBoard Baseline Migration
-- Verifies Flyway migration pipeline is working
-- ==============================================

CREATE TABLE _migration_check (
    id BIGINT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _migration_check (id) VALUES (1);
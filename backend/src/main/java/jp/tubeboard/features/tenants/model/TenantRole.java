package jp.tubeboard.features.tenants.model;

public enum TenantRole {
    OWNER,
    ADMIN,
    MEMBER;

    public boolean isAdminLevel() {
        return this == OWNER || this == ADMIN;
    }
}

package jp.tubeboard.features.tenants.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddTenantMemberRequest(
        @NotBlank(message = "メールアドレスは必須です") @Email(message = "メールアドレスの形式が正しくありません") String email,
        @NotBlank(message = "ロールは必須です") String role) {
}

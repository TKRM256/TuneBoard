package jp.tubeboard.features.tenants.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TenantsCreateRequest(
                @NotBlank(message = "テナント名は必須です") @Size(max = 255, message = "テナント名は255文字以内で入力してください") String name) {
}

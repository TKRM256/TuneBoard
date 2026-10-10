package jp.tubeboard.features.tenants.dto.request;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

public record TenantsUpdateRequest(
                @NotNull(message = "テナントIDは必須です") UUID id,
                @NotBlank(message = "テナント名は必須です") @Size(max = 255, message = "テナント名は255文字以内で入力してください") String name) {
}

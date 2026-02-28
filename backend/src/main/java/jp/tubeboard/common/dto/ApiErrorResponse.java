package jp.tubeboard.common.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiErrorResponse {

    private int status;
    private String error;
    private String message;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}

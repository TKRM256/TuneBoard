package jp.tubeboard.common.exception;

import jp.tubeboard.common.dto.ApiErrorResponse;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageConversionException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import org.springframework.orm.ObjectOptimisticLockingFailureException;

import jp.tubeboard.features.lives.dto.response.SettingSheetSubmissionConflictResponse;
import jp.tubeboard.features.lives.exception.LivesNotFoundException;
import jp.tubeboard.features.lives.exception.SettingSheetSubmissionConflictException;
import jp.tubeboard.features.lives.pdf.canvas.CanvasException;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(NoResourceFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoHandlerFound(NoHandlerFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(HttpMessageConversionException.class)
    public ResponseEntity<ApiErrorResponse> handleConversion(HttpMessageConversionException ex) {
        String message = ex.getMostSpecificCause() != null
                ? ex.getMostSpecificCause().getMessage()
                : "Malformed request body";
        log.warn("リクエストボディ変換エラー: {}", message);
        return buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));

        String message = fieldErrors.values().stream()
                .findFirst()
                .orElse("Validation failed");

        log.warn("バリデーションエラー: {} fields={}", message, fieldErrors);
        return buildResponse(HttpStatus.BAD_REQUEST, message, fieldErrors);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(BadRequestException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ex.getFieldErrors());
    }

    @ExceptionHandler({ TenantsNotFoundException.class, LivesNotFoundException.class })
    public ResponseEntity<ApiErrorResponse> handleDomainNotFound(RuntimeException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(SettingSheetSubmissionConflictException.class)
    public ResponseEntity<SettingSheetSubmissionConflictResponse> handleSubmissionConflict(
            SettingSheetSubmissionConflictException ex) {
        log.warn("提出済みシートの競合を検出しました: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new SettingSheetSubmissionConflictResponse(
                        HttpStatus.CONFLICT.value(),
                        HttpStatus.CONFLICT.getReasonPhrase(),
                        ex.getMessage(),
                        ex.latest()));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.warn("楽観ロックの競合が発生しました: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "他の人がこのシートを更新しました。ページを再読み込みしてください。");
    }

    @ExceptionHandler(CanvasException.class)
    public ResponseEntity<ApiErrorResponse> handleCanvas(CanvasException ex) {
        Map<String, String> details = new LinkedHashMap<>();
        if (ex.elementId() != null) details.put("elementId", ex.elementId());
        log.warn("キャンバスレイアウトエラー: {} {}", ex.getMessage(), details);
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), details.isEmpty() ? null : details);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex) {
        log.error("未処理の例外が発生しました", ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
    }

    private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status, String message) {
        return buildResponse(status, message, null);
    }

    private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status, String message,
            Map<String, String> fieldErrors) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .fieldErrors(fieldErrors)
                .build();
        return ResponseEntity.status(status).body(body);
    }
}

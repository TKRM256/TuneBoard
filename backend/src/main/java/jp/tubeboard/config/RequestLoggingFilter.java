package jp.tubeboard.config;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String TRACE_HEADER = "X-Cloud-Trace-Context";
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestId = resolveRequestId(request);
        MDC.put("requestId", requestId);
        resolveTrace(request);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        long startTime = System.nanoTime();
        String method = request.getMethod();
        String uri = request.getRequestURI();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);
            int status = response.getStatus();

            if (status >= 500) {
                log.error("{} {} -> {} ({}ms)", method, uri, status, durationMs);
            } else if (status >= 400) {
                log.warn("{} {} -> {} ({}ms)", method, uri, status, durationMs);
            } else {
                log.debug("{} {} -> {} ({}ms)", method, uri, status, durationMs);
            }
            MDC.clear();
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        String fromHeader = request.getHeader(REQUEST_ID_HEADER);
        if (fromHeader != null && !fromHeader.isBlank()) {
            return fromHeader;
        }
        return UUID.randomUUID().toString().substring(0, 8);
    }

    // X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=TRACE_TRUE
    private void resolveTrace(HttpServletRequest request) {
        String header = request.getHeader(TRACE_HEADER);
        if (header == null || header.isBlank()) return;

        String traceId = header.split("/")[0];
        if (traceId.isBlank()) return;

        String projectId = System.getenv("GOOGLE_CLOUD_PROJECT");
        if (projectId != null && !projectId.isBlank()) {
            MDC.put("trace", "projects/" + projectId + "/traces/" + traceId);
        } else {
            MDC.put("trace", traceId);
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/h2-console");
    }
}

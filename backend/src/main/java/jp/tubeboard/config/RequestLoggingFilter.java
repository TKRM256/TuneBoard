package jp.tubeboard.config;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * HTTP リクエスト/レスポンスの概要をログ出力するフィルタ。
 * 処理時間も計測する。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long startTime = System.nanoTime();
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String fullPath = buildFullPath(request);
        String host = request.getHeader("Host");
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String forwarded = request.getHeader("Forwarded");

        log.info("Incoming request: method={} fullPath={} host={} xForwardedHost={} xForwardedProto={} forwarded={}",
                method,
                fullPath,
                host,
                forwardedHost,
                forwardedProto,
                forwarded);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.nanoTime() - startTime;
            int status = response.getStatus();
            long durationMs = duration / 1_000_000;

            if (status >= 500) {
                log.error("{} {} -> {} ({}ms)", method, fullPath, status, durationMs);
            } else if (status >= 400) {
                log.warn("{} {} -> {} ({}ms)", method, fullPath, status, durationMs);
            } else {
                log.info("{} {} -> {} ({}ms)", method, fullPath, status, durationMs);
            }
        }
    }

    private String buildFullPath(HttpServletRequest request) {
        String query = request.getQueryString();
        if (query == null || query.isBlank()) {
            return request.getRequestURL().toString();
        }
        return request.getRequestURL().append('?').append(query).toString();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/h2-console");
    }
}

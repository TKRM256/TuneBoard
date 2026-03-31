package jp.tubeboard.config;

import java.io.IOException;
import java.util.Set;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Rejects state-changing requests (POST/PUT/DELETE) that lack the custom
 * {@code X-Requested-With} header. Browsers never attach custom headers to
 * HTML-form submissions or simple cross-site requests, so this blocks CSRF
 * via form-POST while keeping the API accessible to our JS client.
 * <p>
 * Public endpoints that accept form-like submissions from non-JS clients
 * (e.g. OAuth callbacks handled by the browser redirect) are excluded.
 */
@Component
public class RequireCustomHeaderFilter extends OncePerRequestFilter {

    private static final String REQUIRED_HEADER = "X-Requested-With";
    private static final String EXPECTED_VALUE = "TuneBoard";

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private static final Set<String> EXCLUDED_PATHS = Set.of(
            "/api/auth/google/callback",
            "/api/auth/google/login");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        if (SAFE_METHODS.contains(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        for (String excluded : EXCLUDED_PATHS) {
            if (path.equals(excluded)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        String headerValue = request.getHeader(REQUIRED_HEADER);
        if (!EXPECTED_VALUE.equals(headerValue)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Missing or invalid X-Requested-With header\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}

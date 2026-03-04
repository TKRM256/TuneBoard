package jp.tubeboard.features.auth;

import java.net.URI;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;
    private final GoogleOAuthService googleOAuthService;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.auth.cookie-secure:false}")
    private boolean authCookieSecure;

    public AuthController(JwtTokenService jwtTokenService, GoogleOAuthService googleOAuthService) {
        this.jwtTokenService = jwtTokenService;
        this.googleOAuthService = googleOAuthService;
    }

    @GetMapping("/google/login")
    public ResponseEntity<Void> googleLogin(
            @RequestParam(value = "redirect", required = false) String redirectUrl) {
        String frontendRedirect = resolveSafeFrontendRedirect(redirectUrl);
        String state = jwtTokenService.generateOAuthState(frontendRedirect);
        String authorizationUrl = googleOAuthService.buildAuthorizationUrl(state);

        return ResponseEntity.status(302)
                .location(URI.create(authorizationUrl))
                .build();
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> googleCallback(
            @RequestParam("code") String code,
            @RequestParam("state") String state) {
        String frontendRedirect;
        try {
            frontendRedirect = resolveSafeFrontendRedirect(jwtTokenService.extractFrontendRedirectFromState(state));
        } catch (Exception ex) {
            return ResponseEntity.status(302)
                    .location(URI.create(frontendBaseUrl + "?login=error"))
                    .build();
        }

        Map<String, Object> userInfo;
        try {
            userInfo = googleOAuthService.exchangeCodeForUserInfo(code);
        } catch (Exception ex) {
            return ResponseEntity.status(302)
                    .location(URI.create(frontendRedirect + "?login=error"))
                    .build();
        }

        String email = toStringOrEmpty(userInfo.get("email"));
        String name = toStringOrEmpty(userInfo.get("name"));
        String picture = toStringOrEmpty(userInfo.get("picture"));
        String token = jwtTokenService.generateToken(name, email, picture);

        ResponseCookie tokenCookie = ResponseCookie.from("auth_token", token)
                .httpOnly(true)
                .secure(authCookieSecure)
                .path("/")
                .sameSite("Lax")
                .build();

        String separator = frontendRedirect.contains("?") ? "&" : "?";
        String redirectToFrontend = frontendRedirect + separator + "login=success";

        return ResponseEntity.status(302)
                .location(URI.create(redirectToFrontend))
                .header(HttpHeaders.SET_COOKIE, tokenCookie.toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal Object principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "authenticated", false));
        }

        String email = "";
        String name = "";
        String picture = "";

        if (principal instanceof Map<?, ?> claims) {
            email = toStringOrEmpty(claims.get("email"));
            name = toStringOrEmpty(claims.get("name"));
            picture = toStringOrEmpty(claims.get("picture"));
        } else {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "name", name,
                "email", email,
                "picture", picture));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie deleteAuthToken = ResponseCookie.from("auth_token", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .secure(authCookieSecure)
                .sameSite("Lax")
                .build();

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, deleteAuthToken.toString())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String resolveSafeFrontendRedirect(String redirectUrl) {
        URI frontendBaseUri = parseUriOrDefault(frontendBaseUrl, URI.create("http://localhost:5173"));

        if (isBlank(redirectUrl)) {
            return frontendBaseUri.toString();
        }

        try {
            URI candidate = URI.create(redirectUrl);

            if (!candidate.isAbsolute()) {
                if (!redirectUrl.startsWith("/")) {
                    return frontendBaseUri.toString();
                }
                return frontendBaseUri.resolve(redirectUrl).toString();
            }

            if (isSameOrigin(frontendBaseUri, candidate)) {
                return candidate.toString();
            }

            return frontendBaseUri.toString();
        } catch (Exception ex) {
            return frontendBaseUri.toString();
        }
    }

    private URI parseUriOrDefault(String value, URI defaultUri) {
        try {
            return URI.create(value);
        } catch (Exception ex) {
            return defaultUri;
        }
    }

    private boolean isSameOrigin(URI left, URI right) {
        String leftScheme = left.getScheme() == null ? "" : left.getScheme();
        String rightScheme = right.getScheme() == null ? "" : right.getScheme();
        String leftHost = left.getHost() == null ? "" : left.getHost();
        String rightHost = right.getHost() == null ? "" : right.getHost();
        int leftPort = normalizePort(left);
        int rightPort = normalizePort(right);

        return leftScheme.equalsIgnoreCase(rightScheme)
                && leftHost.equalsIgnoreCase(rightHost)
                && leftPort == rightPort;
    }

    private int normalizePort(URI uri) {
        if (uri.getPort() != -1) {
            return uri.getPort();
        }
        if ("https".equalsIgnoreCase(uri.getScheme())) {
            return 443;
        }
        return 80;
    }

    private String toStringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}

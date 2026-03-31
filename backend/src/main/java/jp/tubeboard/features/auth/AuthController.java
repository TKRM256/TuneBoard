package jp.tubeboard.features.auth;

import java.net.URI;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;
    private final GoogleOAuthService googleOAuthService;
    private final UserService userService;
    private final AuthCodeStore authCodeStore;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.auth.cookie-secure:false}")
    private boolean authCookieSecure;

    public AuthController(JwtTokenService jwtTokenService, GoogleOAuthService googleOAuthService,
            UserService userService, AuthCodeStore authCodeStore) {
        this.jwtTokenService = jwtTokenService;
        this.googleOAuthService = googleOAuthService;
        this.userService = userService;
        this.authCodeStore = authCodeStore;
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
        String sub = toStringOrEmpty(userInfo.get("sub"));

        try {
            userService.saveOrUpdateFromGoogleUserInfo(userInfo);
        } catch (Exception ex) {
            return ResponseEntity.status(302)
                    .location(URI.create(frontendRedirect + "?login=error"))
                    .build();
        }

        String token = jwtTokenService.generateToken(sub, name, email, picture);
        String authCode = authCodeStore.createCode(token);

        String sameSitePolicy = authCookieSecure ? "None" : "Lax";
        ResponseCookie tokenCookie = ResponseCookie.from("auth_token", token)
                .httpOnly(true)
                .secure(authCookieSecure)
                .path("/")
                .sameSite(sameSitePolicy)
                .build();

        String separator = frontendRedirect.contains("?") ? "&" : "?";
        String redirectToFrontend = frontendRedirect + separator
                + "login=success&auth_code=" + authCode;

        return ResponseEntity.status(302)
                .location(URI.create(redirectToFrontend))
                .header(HttpHeaders.SET_COOKIE, tokenCookie.toString())
                .build();
    }

    @PostMapping("/exchange")
    public ResponseEntity<Map<String, Object>> exchangeCode(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing code"));
        }

        Optional<String> jwt = authCodeStore.consumeCode(code);
        if (jwt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired code"));
        }

        String sameSitePolicy = authCookieSecure ? "None" : "Lax";
        ResponseCookie tokenCookie = ResponseCookie.from("auth_token", jwt.get())
                .httpOnly(true)
                .secure(authCookieSecure)
                .path("/")
                .sameSite(sameSitePolicy)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, tokenCookie.toString())
                .body(Map.of("success", true));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal Object principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "authenticated", false));
        }

        if (!(principal instanceof Map<?, ?>)) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        User user;
        try {
            user = userService.getCurrentUser();
        } catch (Exception ex) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "id", user.getId(),
                "sub", user.getSub(),
                "name", user.getName(),
                "email", user.getEmail(),
                "picture", toStringOrEmpty(user.getPicture())));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        String sameSitePolicy = authCookieSecure ? "None" : "Lax";
        ResponseCookie deleteAuthToken = ResponseCookie.from("auth_token", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .secure(authCookieSecure)
                .sameSite(sameSitePolicy)
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

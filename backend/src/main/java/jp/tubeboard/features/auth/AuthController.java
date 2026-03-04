package jp.tubeboard.features.auth;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenService jwtTokenService;

    public AuthController(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
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

        if (principal instanceof OAuth2User oauth2User) {
            email = toStringOrEmpty(oauth2User.getAttribute("email"));
            name = toStringOrEmpty(oauth2User.getAttribute("name"));
            picture = toStringOrEmpty(oauth2User.getAttribute("picture"));
        } else if (principal instanceof Map<?, ?> claims) {
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

    @PostMapping("/token")
    public ResponseEntity<Map<String, Object>> token(@AuthenticationPrincipal OAuth2User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "authenticated", false,
                    "message", "OAuth2 login required"));
        }

        String email = toStringOrEmpty(user.getAttribute("email"));
        String name = toStringOrEmpty(user.getAttribute("name"));
        String picture = toStringOrEmpty(user.getAttribute("picture"));

        String token = jwtTokenService.generateToken(name, email, picture);

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "tokenType", "Bearer",
                "accessToken", token,
                "expiresIn", jwtTokenService.getExpirationSeconds()));
    }

    private String toStringOrEmpty(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}

package jp.tubeboard.features.auth;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 開発用のテストログイン（Playwright のシナリオテスト用）。Google を通さずに、テスト用のユーザーとしてログインする。
 * dev プロファイルで、さらに {@code app.dev.test-login=true} を指定したときだけ登録される。本番には存在しない。
 * テスト用のユーザーは sub の先頭に {@code e2e-} を付け、Google でログインした本物のユーザーと混ざらないようにする。
 */
@RestController
@Profile("dev")
@ConditionalOnProperty(name = "app.dev.test-login", havingValue = "true")
@RequestMapping("/api/dev")
public class DevTestLoginController {

    private static final String SUB_PREFIX = "e2e-";

    private final JwtTokenService jwtTokenService;
    private final UserService userService;

    @Value("${app.auth.cookie-secure:false}")
    private boolean authCookieSecure;

    public DevTestLoginController(JwtTokenService jwtTokenService, UserService userService) {
        this.jwtTokenService = jwtTokenService;
        this.userService = userService;
    }

    public record TestLoginRequest(String key, String name) {
    }

    @PostMapping("/test-login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody TestLoginRequest request) {
        String key = request.key() == null || request.key().isBlank() ? "user" : request.key().trim();
        String sub = SUB_PREFIX + key;
        String name = request.name() == null || request.name().isBlank() ? "テストユーザー" : request.name().trim();
        String email = sub + "@example.test";
        User user = userService.saveOrUpdateFromGoogleUserInfo(Map.of("sub", sub, "name", name, "email", email,
                "picture", ""));

        // 通常のログイン（Google のコールバック）と同じ Cookie を渡す
        ResponseCookie cookie = ResponseCookie.from("auth_token", jwtTokenService.generateToken(sub, name, email, ""))
                .httpOnly(true)
                .secure(authCookieSecure)
                .path("/")
                .sameSite("Lax")
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("id", user.getId(), "sub", sub, "name", name, "email", email));
    }
}

package jp.tubeboard.features.auth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

@Service
public class GoogleOAuthService {

    private final RestClient restClient;
    private final String googleClientId;
    private final String googleClientSecret;
    private final String authorizationUri;
    private final String tokenUri;
    private final String userInfoUri;
    private final String redirectUri;

    public GoogleOAuthService(
            @Value("${app.oauth.google.client-id:${GOOGLE_CLIENT_ID:}}") String googleClientId,
            @Value("${app.oauth.google.client-secret:${GOOGLE_CLIENT_SECRET:}}") String googleClientSecret,
            @Value("${app.oauth.google.authorization-uri:https://accounts.google.com/o/oauth2/v2/auth}") String authorizationUri,
            @Value("${app.oauth.google.token-uri:https://oauth2.googleapis.com/token}") String tokenUri,
            @Value("${app.oauth.google.userinfo-uri:https://openidconnect.googleapis.com/v1/userinfo}") String userInfoUri,
            @Value("${app.oauth.google.redirect-uri:http://localhost:8080/api/auth/google/callback}") String redirectUri) {
        this.restClient = RestClient.create();
        this.googleClientId = googleClientId;
        this.googleClientSecret = googleClientSecret;
        this.authorizationUri = authorizationUri;
        this.tokenUri = tokenUri;
        this.userInfoUri = userInfoUri;
        this.redirectUri = redirectUri;
    }

    public String buildAuthorizationUrl(String state) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new IllegalStateException("Google OAuth client id is missing");
        }

        String encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        String encodedScope = URLEncoder.encode("openid profile email", StandardCharsets.UTF_8);
        String encodedState = URLEncoder.encode(state, StandardCharsets.UTF_8);

        return authorizationUri
                + "?client_id=" + googleClientId
                + "&redirect_uri=" + encodedRedirectUri
                + "&response_type=code"
                + "&scope=" + encodedScope
                + "&state=" + encodedState;
    }

    public Map<String, Object> exchangeCodeForUserInfo(String code) {
        if (googleClientId == null || googleClientId.isBlank() || googleClientSecret == null
                || googleClientSecret.isBlank()) {
            throw new IllegalStateException("Google OAuth client settings are missing");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", googleClientId);
        form.add("client_secret", googleClientSecret);
        form.add("code", code);
        form.add("redirect_uri", redirectUri);

        Map<String, Object> tokenResponse = restClient.post()
                .uri(tokenUri)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });

        if (tokenResponse == null || tokenResponse.get("access_token") == null) {
            throw new IllegalStateException("Failed to get Google access token");
        }

        String accessToken = String.valueOf(tokenResponse.get("access_token"));

        Map<String, Object> userInfo = restClient.get()
                .uri(userInfoUri)
                .headers(headers -> headers.setBearerAuth(accessToken))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {
                });

        if (userInfo == null) {
            throw new IllegalStateException("Failed to get Google user info");
        }

        return userInfo;
    }
}

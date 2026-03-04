package jp.tubeboard.features.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtTokenService {

    private final SecretKey secretKey;
    private final long expirationMillis;

    public JwtTokenService(
            @Value("${app.jwt.secret:change-this-secret-key-at-least-32-characters}") String secret,
            @Value("${app.jwt.expiration-millis:3600000}") long expirationMillis) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = expirationMillis;
    }

    public String generateToken(String name, String email, String picture) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(expirationMillis);

        return Jwts.builder()
                .subject(email == null ? "" : email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claims(Map.of(
                        "name", name == null ? "" : name,
                        "email", email == null ? "" : email,
                        "picture", picture == null ? "" : picture))
                .signWith(secretKey)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getExpirationSeconds() {
        return expirationMillis / 1000;
    }
}

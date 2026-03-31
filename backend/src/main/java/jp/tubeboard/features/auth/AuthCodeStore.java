package jp.tubeboard.features.auth;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class AuthCodeStore {

    private static final long CODE_TTL_MILLIS = 30_000;

    private record Entry(String jwt, long createdAt) {
    }

    private final ConcurrentHashMap<String, Entry> store = new ConcurrentHashMap<>();

    public String createCode(String jwt) {
        cleanup();
        String code = UUID.randomUUID().toString();
        store.put(code, new Entry(jwt, System.currentTimeMillis()));
        return code;
    }

    public Optional<String> consumeCode(String code) {
        Entry entry = store.remove(code);
        if (entry == null || System.currentTimeMillis() - entry.createdAt() > CODE_TTL_MILLIS) {
            return Optional.empty();
        }
        return Optional.of(entry.jwt());
    }

    private void cleanup() {
        long now = System.currentTimeMillis();
        store.entrySet().removeIf(e -> now - e.getValue().createdAt() > CODE_TTL_MILLIS);
    }
}

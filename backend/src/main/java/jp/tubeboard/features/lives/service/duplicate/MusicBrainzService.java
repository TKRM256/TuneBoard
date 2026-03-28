package jp.tubeboard.features.lives.service.duplicate;

import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.model.MusicBrainzCacheEntry;
import jp.tubeboard.features.lives.repository.MusicBrainzCacheRepository;

/**
 * MusicBrainz Web Service 2 API を使用して楽曲の正規化情報を取得するサービス。
 * <p>
 * Rate limit: 1 request per second (MusicBrainz policy).
 * User-Agent must include application name + contact.
 */
@Service
public class MusicBrainzService {

    private static final Logger log = LoggerFactory.getLogger(MusicBrainzService.class);
    private static final String BASE_URL = "https://musicbrainz.org/ws/2";
    private static final String USER_AGENT = "TuneBoard/0.1 (https://github.com/tuneboard)";

    private final RestClient restClient;
    private final MusicBrainzCacheRepository cacheRepository;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    private long lastRequestTime = 0;

    public MusicBrainzService(MusicBrainzCacheRepository cacheRepository) {
        this.cacheRepository = cacheRepository;
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader("User-Agent", USER_AGENT)
                .defaultHeader("Accept", "application/json")
                .build();
    }

    public Optional<MusicBrainzRecording> searchRecording(String title, String artist) {
        if (title == null || title.isBlank()) {
            return Optional.empty();
        }

        String normalizedTitle = SongDuplicateDetectionService.normalize(title);
        String normalizedArtist = SongDuplicateDetectionService.normalize(artist);

        // DB cache check
        Optional<MusicBrainzCacheEntry> cached = cacheRepository
                .findByNormalizedTitleAndNormalizedArtist(normalizedTitle, normalizedArtist);
        if (cached.isPresent()) {
            MusicBrainzCacheEntry entry = cached.get();
            if (!entry.isFound()) {
                return Optional.empty();
            }
            return Optional.of(new MusicBrainzRecording(entry.getMbid(), entry.getMbTitle(), entry.getMbArtist()));
        }

        // API call
        Optional<MusicBrainzRecording> result = callApi(title, artist);

        // Store in cache
        MusicBrainzCacheEntry.MusicBrainzCacheEntryBuilder builder = MusicBrainzCacheEntry.builder()
                .normalizedTitle(normalizedTitle)
                .normalizedArtist(normalizedArtist);
        if (result.isPresent()) {
            MusicBrainzRecording recording = result.get();
            builder.found(true).mbid(recording.mbid()).mbTitle(recording.title()).mbArtist(recording.artist());
        } else {
            builder.found(false);
        }
        cacheRepository.save(builder.build());

        return result;
    }

    private Optional<MusicBrainzRecording> callApi(String title, String artist) {
        try {
            // 1. title + artist で検索
            Optional<MusicBrainzRecording> result = executeSearch(title, artist);
            if (result.isPresent()) {
                return result;
            }

            // 2. artist 付きで見つからなかった場合、title のみで再検索 (略称・誤記対策)
            if (artist != null && !artist.isBlank()) {
                log.info("title+artist で見つからず title のみで再検索: title={}, artist={}", title, artist);
                result = executeSearch(title, null);
            }
            return result;

        } catch (Exception ex) {
            log.warn("MusicBrainz API呼び出しに失敗: title={}, artist={}", title, artist, ex);
            return Optional.empty();
        }
    }

    private Optional<MusicBrainzRecording> executeSearch(String title, String artist) throws Exception {
        throttle();

        String query = buildQuery(title, artist);
        log.info("MusicBrainz検索クエリ: {}", query);

        String body = restClient.get()
                .uri("/recording?query={query}&fmt=json&limit=5", query)
                .retrieve()
                .body(String.class);

        if (body == null || body.isBlank()) {
            return Optional.empty();
        }

        MusicBrainzSearchResult result = objectMapper.readValue(body, MusicBrainzSearchResult.class);
        if (result.recordings() == null || result.recordings().isEmpty()) {
            return Optional.empty();
        }

        String normalizedSearchTitle = SongDuplicateDetectionService.normalize(title);

        return result.recordings().stream()
                .filter(recording -> recording.score() >= 80)
                .filter(recording -> isTitleRelevant(normalizedSearchTitle, recording.title()))
                .findFirst()
                .map(recording -> new MusicBrainzRecording(
                        recording.id(),
                        recording.title() != null ? recording.title() : title,
                        resolveArtistName(recording, artist)));
    }

    private String buildQuery(String title, String artist) {
        StringBuilder query = new StringBuilder();
        query.append("recording:\"").append(escapeQuotedPhrase(title)).append("\"");
        if (artist != null && !artist.isBlank()) {
            query.append(" AND artist:\"").append(escapeQuotedPhrase(artist)).append("\"");
        }
        return query.toString();
    }

    /**
     * Lucene のフレーズクエリ ("...") 内ではダブルクォートとバックスラッシュだけエスケープすればよい。
     * それ以外の特殊文字はフレーズ内ではリテラルとして扱われる。
     */
    private String escapeQuotedPhrase(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String resolveArtistName(MusicBrainzRecordingEntry recording, String fallback) {
        if (recording.artistCredit() != null && !recording.artistCredit().isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (ArtistCredit credit : recording.artistCredit()) {
                if (credit.artist() != null && credit.artist().name() != null) {
                    if (!sb.isEmpty()) {
                        sb.append(credit.joinphrase() != null ? credit.joinphrase() : ", ");
                    }
                    sb.append(credit.artist().name());
                }
            }
            if (!sb.isEmpty()) {
                return sb.toString();
            }
        }
        return fallback != null ? fallback : "";
    }

    private boolean isTitleRelevant(String normalizedSearchTitle, String resultTitle) {
        if (resultTitle == null || resultTitle.isBlank()) {
            return false;
        }
        String normalizedResult = SongDuplicateDetectionService.normalize(resultTitle);
        return normalizedResult.contains(normalizedSearchTitle)
                || normalizedSearchTitle.contains(normalizedResult);
    }

    private synchronized void throttle() {
        long now = System.currentTimeMillis();
        long elapsed = now - lastRequestTime;
        if (elapsed < 1100) {
            try {
                Thread.sleep(1100 - elapsed);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }
        lastRequestTime = System.currentTimeMillis();
    }

    // --- JSON mapping records ---

    public record MusicBrainzRecording(
            String mbid,
            String title,
            String artist) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record MusicBrainzSearchResult(List<MusicBrainzRecordingEntry> recordings) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record MusicBrainzRecordingEntry(
            String id,
            String title,
            int score,
            List<ArtistCredit> artistCredit) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ArtistCredit(
            ArtistEntry artist,
            String joinphrase) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ArtistEntry(String name) {
    }
}

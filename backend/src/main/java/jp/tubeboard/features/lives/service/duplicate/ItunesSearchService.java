package jp.tubeboard.features.lives.service.duplicate;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

/**
 * iTunes Search API を使用して楽曲検索を行うサービス。
 * 認証不要で誰でも利用可能。
 */
@Service
public class ItunesSearchService {

        private static final Logger log = LoggerFactory.getLogger(ItunesSearchService.class);
        private static final String SEARCH_URL = "https://itunes.apple.com/search";

        private final RestClient restClient;
        private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

        public ItunesSearchService() {
                HttpComponentsClientHttpRequestFactory requestFactory = new HttpComponentsClientHttpRequestFactory();
                requestFactory.setReadTimeout(1000);
                requestFactory.setConnectionRequestTimeout(1000);

                this.restClient = RestClient.builder()
                                .defaultHeader("Accept", "application/json")
                                .requestFactory(requestFactory)
                                .build();
        }

        /**
         * iTunes Search API で楽曲を検索する。
         *
         * @param query 検索クエリ（曲名、アーティスト名など）
         * @param limit 最大件数 (1-200)
         * @return 検索結果のトラックリスト
         */
        public List<ItunesTrack> searchTracks(String query, int limit) {
                try {
                        String body = restClient.get()
                                        .uri(SEARCH_URL + "?term={term}&media=music&entity=song&country=JP&limit={limit}",
                                                        query, Math.min(limit, 200))
                                        .retrieve()
                                        .body(String.class);

                        if (body == null || body.isBlank()) {
                                return List.of();
                        }

                        ItunesSearchResult result = objectMapper.readValue(body, ItunesSearchResult.class);
                        if (result.results() == null) {
                                return List.of();
                        }

                        return result.results().stream()
                                        .map(this::toItunesTrack)
                                        .toList();

                } catch (Exception ex) {
                        log.warn("iTunes Search API 検索に失敗: query={}", query, ex);
                        return List.of();
                }
        }

        private ItunesTrack toItunesTrack(ItunesResult item) {
                String artworkUrl = item.artworkUrl100() != null
                                ? item.artworkUrl100().replace("100x100bb", "300x300bb")
                                : null;

                return new ItunesTrack(
                                String.valueOf(item.trackId()),
                                item.trackName() != null ? item.trackName() : "",
                                item.artistName() != null ? item.artistName() : "",
                                item.collectionName() != null ? item.collectionName() : "",
                                artworkUrl,
                                item.previewUrl(),
                                item.trackViewUrl());
        }

        // --- Public DTO ---

        public record ItunesTrack(
                        String id,
                        String name,
                        String artist,
                        String album,
                        String albumArtUrl,
                        String previewUrl,
                        String trackViewUrl) {
        }

        // --- JSON mapping records ---

        @JsonIgnoreProperties(ignoreUnknown = true)
        private record ItunesSearchResult(
                        @JsonProperty("resultCount") int resultCount,
                        List<ItunesResult> results) {
        }

        @JsonIgnoreProperties(ignoreUnknown = true)
        private record ItunesResult(
                        long trackId,
                        String trackName,
                        String artistName,
                        String collectionName,
                        String artworkUrl100,
                        String previewUrl,
                        String trackViewUrl) {
        }
}

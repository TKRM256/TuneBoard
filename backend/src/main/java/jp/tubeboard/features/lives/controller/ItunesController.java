package jp.tubeboard.features.lives.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jp.tubeboard.features.lives.service.duplicate.ItunesSearchService;
import jp.tubeboard.features.lives.service.duplicate.ItunesSearchService.ItunesTrack;
import lombok.AllArgsConstructor;

/**
 * 公開 iTunes 検索エンドポイント。
 * 認証不要でフォーム入力中のユーザーが楽曲検索できるようにする。
 */
@RestController
@RequestMapping("/api/public/itunes")
@AllArgsConstructor
public class ItunesController {

    private final ItunesSearchService itunesSearchService;

    @GetMapping("/search")
    public ResponseEntity<List<ItunesTrack>> search(
            @RequestParam("q") String query,
            @RequestParam(value = "limit", defaultValue = "5") int limit) {
        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        List<ItunesTrack> tracks = itunesSearchService.searchTracks(query.trim(), limit);
        return ResponseEntity.ok(tracks);
    }
}

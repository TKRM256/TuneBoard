package jp.tubeboard.features.lives.venueform.render;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** 描画中に見つかった、出力は続けられるが管理者に知らせたい問題（表のあふれ・条件式のエラーなど）。 */
public final class RenderWarnings {

    private static final int MAX_WARNINGS = 100;

    private final Set<String> messages = new LinkedHashSet<>();

    public void add(int pageNumber, String message) {
        if (messages.size() < MAX_WARNINGS) {
            messages.add(pageNumber + "ページ目: " + message);
        }
    }

    /** ページに依らない警告（書類全体を見て分かること）。 */
    public void addGeneral(String message) {
        if (messages.size() < MAX_WARNINGS) {
            messages.add(message);
        }
    }

    public List<String> list() {
        return new ArrayList<>(messages);
    }
}

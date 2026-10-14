package jp.tubeboard.features.lives.venueform.render;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;

/**
 * 会場書式の式から、グループの何件目までを書く欄があるかを読み取る。
 * 表の欄に 1 件ずつテキストを並べた書式では、表の要素の代わりにこれで書ききれない件を数える。
 */
final class ItemReferences {

    /** {@code groups['id'].items[N]}（引用符は ' と " のどちらでもよい）。入れ子のグループは数えない。 */
    private static final Pattern ITEM_REF = Pattern.compile(
            "groups\\[\\s*(['\"])([^'\"]+)\\1\\s*]\\s*\\.items\\[\\s*(\\d+)\\s*]");

    private ItemReferences() {
    }

    /** グループ ID → 書く欄がある件数（参照している items[N] の最大の N + 1）。 */
    static Map<String, Integer> coveredCounts(VenueFormDocument document) {
        Map<String, Integer> counts = new HashMap<>();
        if (document == null || document.elements() == null) {
            return counts;
        }
        for (VenueElement element : document.elements()) {
            collect(element.condition(), counts);
            if (element instanceof VenueElement.TextElement text) {
                collect(text.content(), counts);
            }
        }
        return counts;
    }

    private static void collect(String text, Map<String, Integer> counts) {
        if (text == null || text.isEmpty()) {
            return;
        }
        Matcher matcher = ITEM_REF.matcher(text);
        while (matcher.find()) {
            int upTo = Integer.parseInt(matcher.group(3)) + 1;
            counts.merge(matcher.group(2), upTo, Math::max);
        }
    }
}

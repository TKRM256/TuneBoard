package jp.tubeboard.features.lives.export.context;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.apache.commons.jexl3.JexlScript;
import org.apache.commons.jexl3.MapContext;

import jp.tubeboard.features.lives.export.context.CanvasContext.GroupRef;
import jp.tubeboard.features.lives.export.context.CanvasContext.ItemRef;
import jp.tubeboard.features.lives.service.DurationFormat;

/** Helper functions exposed in the default JEXL namespace. */
public final class ExpressionHelpers {
    private static final DateTimeFormatter DEFAULT_DATE = DateTimeFormatter.ofPattern("yyyy/M/d", Locale.JAPAN);

    public Object boolMark(Object value) {
        if (value == null) return "×";
        String s = value.toString();
        if ("true".equalsIgnoreCase(s) || "1".equals(s) || "yes".equalsIgnoreCase(s)) return "○";
        return "×";
    }

    public String join(Object values, String sep) {
        if (values == null) return "";
        String separator = sep == null ? "" : sep;
        if (values instanceof GroupRef g) return joinItems(g.getItems(), separator, null);
        if (values instanceof List<?> list) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(separator);
                sb.append(list.get(i));
            }
            return sb.toString();
        }
        return values.toString();
    }

    /** Join one field across all items of a repeatable group:
     *  {@code joinField(groups['members'], 'member-name', ' / ')}. */
    public String joinField(Object groupOrItems, String fieldId, String sep) {
        String separator = sep == null ? "" : sep;
        List<ItemRef> items = asItems(groupOrItems);
        return joinItems(items, separator, fieldId);
    }

    /** Pluck the values of a single field across a group, returning a list
     *  (so further filters/joins can be chained). */
    public List<String> pluck(Object groupOrItems, String fieldId) {
        List<ItemRef> items = asItems(groupOrItems);
        List<String> out = new ArrayList<>(items.size());
        for (ItemRef item : items) out.add(item.field(fieldId).getValue());
        return out;
    }

    /** Filter a group's items by a predicate field equal to a value. */
    public List<ItemRef> filterEquals(Object groupOrItems, String fieldId, Object expected) {
        List<ItemRef> items = asItems(groupOrItems);
        String target = expected == null ? "" : expected.toString();
        List<ItemRef> out = new ArrayList<>();
        for (ItemRef item : items) {
            if (target.equals(item.field(fieldId).getValue())) out.add(item);
        }
        return out;
    }

    public String truncate(Object value, int max) {
        if (value == null) return "";
        String s = value.toString();
        if (s.length() <= max) return s;
        return s.substring(0, Math.max(0, max - 1)) + "…";
    }

    public String formatDate(Object value, String pattern) {
        if (value == null) return "";
        DateTimeFormatter fmt = pattern == null || pattern.isBlank() ? DEFAULT_DATE
                : DateTimeFormatter.ofPattern(pattern, Locale.JAPAN);
        if (value instanceof LocalDate d) return fmt.format(d);
        if (value instanceof LocalDateTime dt) return fmt.format(dt);
        return value.toString();
    }

    public Object defaultTo(Object value, Object fallback) {
        if (value == null) return fallback;
        String s = value.toString();
        return s.isBlank() ? fallback : value;
    }

    public int count(Object value) {
        if (value == null) return 0;
        if (value instanceof List<?> list) return list.size();
        if (value instanceof GroupRef g) return g.getCount();
        return 0;
    }

    public boolean contains(Object collection, Object needle) {
        if (collection instanceof List<?> list) return list.contains(needle == null ? null : needle.toString());
        if (collection == null) return false;
        return collection.toString().contains(needle == null ? "" : needle.toString());
    }

    /** 演奏時間（"分:秒"）を秒に直す。読めない値は 0。 */
    public int durationSeconds(Object value) {
        return value == null ? 0 : DurationFormat.parseSeconds(value.toString()).orElse(0);
    }

    /** 秒を "分:秒" に直す。 */
    public String formatDuration(Object seconds) {
        if (seconds instanceof Number n) return DurationFormat.format(n.longValue());
        return "";
    }

    /** グループ内の演奏時間の合計（"分:秒"）。空欄や読めない値は数えない。
     *  Usage: {@code sumDuration(groups['setlist'], 'song-duration')} */
    public String sumDuration(Object groupOrItems, String fieldId) {
        long total = 0;
        for (ItemRef item : asItems(groupOrItems)) {
            total += durationSeconds(item.field(fieldId).getValue());
        }
        return DurationFormat.format(total);
    }

    /** グループ内の曲の演奏時間の概算（iTunes の長さを分に切り上げたもの）の合計（分）。長さの分からない曲は数えない。
     *  Usage: {@code sumApproxMinutes(groups['setlist'], 'song')} */
    public int sumApproxMinutes(Object groupOrItems, String songFieldId) {
        int total = 0;
        for (ItemRef item : asItems(groupOrItems)) {
            Integer minutes = item.field(songFieldId).getApproxMinutes();
            if (minutes != null) total += minutes;
        }
        return total;
    }

    /** Map each item in a group/list through a JEXL lambda and return the results.
     *  Usage: {@code map(groups['members'].items, (m) -> m.field('name').value)} */
    public List<Object> map(Object groupOrItems, JexlScript fn) {
        List<ItemRef> items = asItems(groupOrItems);
        List<Object> out = new ArrayList<>(items.size());
        for (ItemRef item : items) out.add(fn.execute(new MapContext(), item));
        return out;
    }

    /** Map then join with a separator. Equivalent to map(…).join(sep).
     *  Usage: {@code mapJoin(groups['members'].items, (m) -> m.field('name').value, ' / ')} */
    public String mapJoin(Object groupOrItems, JexlScript fn, String sep) {
        String separator = sep == null ? "" : sep;
        List<Object> mapped = map(groupOrItems, fn);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < mapped.size(); i++) {
            if (i > 0) sb.append(separator);
            Object v = mapped.get(i);
            sb.append(v == null ? "" : v.toString());
        }
        return sb.toString();
    }

    /** Filter items where a JEXL lambda predicate returns true.
     *  Usage: {@code filter(groups['members'].items, (m) -> m.field('role').value == 'leader')} */
    public List<ItemRef> filter(Object groupOrItems, JexlScript predicate) {
        List<ItemRef> items = asItems(groupOrItems);
        List<ItemRef> out = new ArrayList<>();
        for (ItemRef item : items) {
            Object r = predicate.execute(new MapContext(), item);
            if (r instanceof Boolean b && b) out.add(item);
            else if (r != null && "true".equalsIgnoreCase(r.toString())) out.add(item);
        }
        return out;
    }

    /** Return the first item matching a JEXL lambda predicate, or null. */
    public ItemRef find(Object groupOrItems, JexlScript predicate) {
        for (ItemRef item : filter(groupOrItems, predicate)) return item;
        return null;
    }

    @SuppressWarnings("unchecked")
    private static List<ItemRef> asItems(Object value) {
        if (value == null) return List.of();
        if (value instanceof GroupRef g) return g.getItems();
        if (value instanceof List<?> list) {
            if (list.isEmpty()) return List.of();
            if (list.get(0) instanceof ItemRef) return (List<ItemRef>) value;
        }
        return List.of();
    }

    private static String joinItems(List<ItemRef> items, String sep, String fieldId) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(sep);
            ItemRef item = items.get(i);
            if (fieldId == null) sb.append(item.toString());
            else sb.append(item.field(fieldId).getValue());
        }
        return sb.toString();
    }
}

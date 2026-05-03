package jp.tubeboard.features.lives.pdf.dsl;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.jexl3.JexlBuilder;
import org.apache.commons.jexl3.JexlContext;
import org.apache.commons.jexl3.JexlEngine;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.jexl3.MapContext;
import org.apache.commons.jexl3.introspection.JexlPermissions;
import org.springframework.stereotype.Component;

import jp.tubeboard.features.lives.pdf.dsl.DslContext.GroupRef;
import jp.tubeboard.features.lives.pdf.dsl.DslContext.Helpers;

/**
 * Sandboxed expression evaluator. Uses a permissive sandbox with explicit
 * blocks for dangerous classes (Runtime, System, Class, etc.) and registers
 * helper functions in the default (null) namespace so users can call
 * {@code ${boolMark(v)}} directly.
 */
@Component
public class DslEvaluator {

    private static final Pattern INTERPOLATION = Pattern.compile("\\$\\{([^}]*)\\}");

    private final JexlEngine engine;
    private final Helpers helpers = new Helpers();

    public DslEvaluator() {
        // Default-namespace functions need null key (Map.of doesn't allow that).
        Map<String, Object> namespaces = new HashMap<>();
        namespaces.put(null, helpers);

        // RESTRICTED denies user-defined classes; explicitly compose-in our own package.
        JexlPermissions perms = JexlPermissions.RESTRICTED.compose("jp.tubeboard.features.lives.pdf.dsl.*");

        this.engine = new JexlBuilder()
                .permissions(perms)
                .namespaces(namespaces)
                .strict(false)
                .silent(false)
                .safe(true)
                .create();
    }

    public String interpolate(String template, Map<String, Object> namespace) {
        if (template == null || template.isEmpty() || !template.contains("${")) {
            return template == null ? "" : template;
        }
        Matcher matcher = INTERPOLATION.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (matcher.find()) {
            String expr = matcher.group(1);
            Object value;
            try {
                value = evaluateValue(expr, namespace);
            } catch (DslException ex) {
                value = "[" + ex.getMessage() + "]";
            }
            matcher.appendReplacement(sb, Matcher.quoteReplacement(formatValue(value)));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public boolean evaluateBoolean(String expression, Map<String, Object> namespace) {
        Object value = evaluateValue(stripWrapping(expression), namespace);
        if (value == null) return false;
        if (value instanceof Boolean b) return b;
        if (value instanceof Number n) return n.doubleValue() != 0d;
        return !value.toString().isEmpty();
    }

    public Object evaluateValue(String expression, Map<String, Object> namespace) {
        if (expression == null || expression.isBlank()) return null;
        String trimmed = expression.trim();
        try {
            JexlExpression compiled = engine.createExpression(trimmed);
            JexlContext ctx = createContext(namespace);
            return compiled.evaluate(ctx);
        } catch (JexlException ex) {
            throw new DslException("式の評価に失敗: " + trimmed + " (" + ex.getMessage() + ")", ex,
                    null, null, null);
        }
    }

    public List<?> evaluateItems(String expression, Map<String, Object> namespace) {
        Object value = evaluateValue(stripWrapping(expression), namespace);
        if (value == null) return List.of();
        if (value instanceof GroupRef g) return g.getItems();
        if (value instanceof List<?> list) return list;
        if (value.getClass().isArray()) return Arrays.asList((Object[]) value);
        throw new DslException("for-each の items はリストである必要があります: " + expression, null, null, null);
    }

    private JexlContext createContext(Map<String, Object> namespace) {
        Map<String, Object> merged = new HashMap<>(namespace);
        merged.putIfAbsent("helpers", helpers);
        return new MapContext(merged);
    }

    private String stripWrapping(String expression) {
        if (expression == null) return "";
        String t = expression.trim();
        if (t.startsWith("${") && t.endsWith("}")) {
            return t.substring(2, t.length() - 1);
        }
        return t;
    }

    private String formatValue(Object value) {
        if (value == null) return "";
        if (value instanceof java.time.LocalDate d) {
            return helpers.formatDate(d, "yyyy/M/d");
        }
        if (value instanceof java.time.LocalDateTime dt) {
            return helpers.formatDate(dt, "yyyy/M/d HH:mm");
        }
        return value.toString();
    }
}

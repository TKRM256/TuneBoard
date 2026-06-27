package jp.tubeboard.features.lives.pdf.canvas;

import java.util.HashMap;
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

import jp.tubeboard.features.lives.pdf.canvas.CanvasContext.Helpers;

/**
 * Sandboxed JEXL evaluator used by canvas text/field elements. Supports
 * {@code ${...}} interpolation and exposes the helper functions in the default
 * namespace so users can write {@code ${boolMark(value)}} directly.
 */
@Component
public class ExpressionEvaluator {

    private static final Pattern INTERPOLATION = Pattern.compile("\\$\\{([^}]*)\\}");

    private final JexlEngine engine;
    private final Helpers helpers = new Helpers();

    public ExpressionEvaluator() {
        Map<String, Object> namespaces = new HashMap<>();
        namespaces.put(null, helpers);

        JexlPermissions perms = JexlPermissions.RESTRICTED.compose("jp.tubeboard.features.lives.pdf.canvas.*");

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
                value = evaluate(expr, namespace);
            } catch (CanvasException ex) {
                value = "[" + ex.getMessage() + "]";
            }
            matcher.appendReplacement(sb, Matcher.quoteReplacement(formatValue(value)));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    public Object evaluate(String expression, Map<String, Object> namespace) {
        if (expression == null || expression.isBlank()) return null;
        String trimmed = expression.trim();
        try {
            JexlExpression compiled = engine.createExpression(trimmed);
            JexlContext ctx = createContext(namespace);
            return compiled.evaluate(ctx);
        } catch (JexlException ex) {
            throw new CanvasException("式の評価に失敗: " + trimmed + " (" + ex.getMessage() + ")", ex);
        }
    }

    private JexlContext createContext(Map<String, Object> namespace) {
        Map<String, Object> merged = new HashMap<>(namespace);
        merged.putIfAbsent("helpers", helpers);
        return new MapContext(merged);
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

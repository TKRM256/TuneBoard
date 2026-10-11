package jp.tubeboard.features.lives.export.context;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

import org.apache.commons.jexl3.JexlBuilder;
import org.apache.commons.jexl3.JexlContext;
import org.apache.commons.jexl3.JexlEngine;
import org.apache.commons.jexl3.JexlException;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.jexl3.MapContext;
import org.apache.commons.jexl3.introspection.JexlPermissions;
import org.apache.commons.jexl3.introspection.JexlSandbox;
import org.springframework.stereotype.Component;

/**
 * Sandboxed JEXL evaluator used by canvas text/field elements. Supports
 * {@code ${...}} interpolation and exposes the helper functions in the default
 * namespace so users can write {@code ${boolMark(value)}} directly.
 */
@Component
public class ExpressionEvaluator {

    /** 1 つのテキスト要素に出す文字数の上限。PDF 1 ページに収まる量を大きく超える値は切り詰める。 */
    private static final int MAX_OUTPUT_LENGTH = 10_000;

    private final JexlEngine engine;
    private final ExpressionHelpers helpers = new ExpressionHelpers();

    public ExpressionEvaluator() {
        Map<String, Object> namespaces = new HashMap<>();
        namespaces.put(null, helpers);

        JexlPermissions perms = JexlPermissions.RESTRICTED.compose("jp.tubeboard.features.lives.export.context.*");

        // 短い式から巨大な文字列を作れるメソッドは、メンバー権限でもメモリを食い潰せるので塞ぐ
        JexlSandbox sandbox = new JexlSandbox(true);
        sandbox.block(String.class.getName()).execute("repeat", "formatted", "indent");

        this.engine = new JexlBuilder()
                .permissions(perms)
                .sandbox(sandbox)
                .namespaces(namespaces)
                .strict(false)
                .silent(false)
                .safe(true)
                .create();
    }

    /** 評価に失敗した式は「[エラー内容]」として文字に残す（PDF の自由レイアウト・式のプレビュー向け）。 */
    public String interpolate(String template, Map<String, Object> namespace) {
        return interpolate(template, namespace, null);
    }

    /**
     * @param onError 渡すと、評価に失敗した式は空にしてエラー内容をこちらへ知らせる
     *                （会場書式のように、紙面にエラーの文字を出したくない場合）
     */
    public String interpolate(String template, Map<String, Object> namespace, Consumer<String> onError) {
        if (template == null || template.isEmpty() || !template.contains("${")) {
            return template == null ? "" : template;
        }
        StringBuilder sb = new StringBuilder();
        for (TemplateScanner.Segment segment : TemplateScanner.scan(template)) {
            if (!segment.expression()) {
                sb.append(segment.text());
                continue;
            }
            try {
                sb.append(formatValue(evaluate(segment.text(), namespace)));
            } catch (CanvasException ex) {
                if (onError == null) {
                    sb.append('[').append(ex.getMessage()).append(']');
                } else {
                    onError.accept(ex.getMessage());
                }
            }
            if (sb.length() > MAX_OUTPUT_LENGTH) {
                break;
            }
        }
        return sb.length() > MAX_OUTPUT_LENGTH ? sb.substring(0, MAX_OUTPUT_LENGTH) + "…" : sb.toString();
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

package jp.tubeboard.features.lives.venueform.render;

import java.util.Collection;
import java.util.Map;

import jp.tubeboard.features.lives.export.context.CanvasException;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;

/**
 * 要素の表示条件（JEXL）を評価する。式は {@code ${...}} で囲んでも囲まなくてもよい。
 */
public final class ConditionEvaluator {

    private final ExpressionEvaluator evaluator;

    public ConditionEvaluator(ExpressionEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    /**
     * @return 描いてよいなら true。条件が空なら常に true
     * @throws CanvasException 式の評価に失敗したとき
     */
    public boolean passes(String condition, Map<String, Object> namespace) {
        String expression = unwrap(condition);
        if (expression.isEmpty()) {
            return true;
        }
        return truthy(evaluator.evaluate(expression, namespace));
    }

    static String unwrap(String condition) {
        if (condition == null) {
            return "";
        }
        String trimmed = condition.trim();
        if (trimmed.startsWith("${") && trimmed.endsWith("}")) {
            return trimmed.substring(2, trimmed.length() - 1).trim();
        }
        return trimmed;
    }

    /** true・0 以外の数・空でない文字（"false" と "0" を除く）・空でないリストを「真」とみなす。 */
    static boolean truthy(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.doubleValue() != 0;
        }
        if (value instanceof Collection<?> c) {
            return !c.isEmpty();
        }
        String s = value.toString().trim();
        return !s.isEmpty() && !"false".equalsIgnoreCase(s) && !"0".equals(s);
    }
}

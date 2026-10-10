package jp.tubeboard.features.lives.pdf.canvas;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class ExpressionEvaluatorTest {

    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();

    @Test
    void 通常の文字列メソッドは使える() {
        assertThat(evaluator.interpolate("${'abc'.toUpperCase()}", Map.of())).isEqualTo("ABC");
    }

    @Test
    void 巨大な文字列を作るメソッドは実行されない() {
        String result = evaluator.interpolate("${'x'.repeat(50000000)}", Map.of());

        assertThat(result.length()).isLessThan(1000);
    }

    @Test
    void 出力は上限の長さで切り詰められる() {
        String longValue = "a".repeat(20_000);

        String result = evaluator.interpolate("${value}", Map.of("value", longValue));

        assertThat(result).hasSize(10_001).endsWith("…");
    }
}

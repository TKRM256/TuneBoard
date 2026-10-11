package jp.tubeboard.features.lives.export.context;

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
    void 件数を超えた番号を指定しても空になるだけで失敗しない() {
        CanvasContext.ItemRef only = new CanvasContext.ItemRef(0, "", Map.of("name",
                new CanvasContext.FieldRef("田中", java.util.List.of("田中"), false)), Map.of());
        Map<String, Object> ns = Map.of("groups", Map.of("members",
                new CanvasContext.GroupRef(java.util.List.of(only), 1)));

        assertThat(evaluator.interpolate("${groups['members'].items[0].field('name').value}", ns)).isEqualTo("田中");
        assertThat(evaluator.interpolate("[${groups['members'].items[3].field('name').value}]", ns)).isEqualTo("[]");
        assertThat(evaluator.interpolate("[${groups['nothing'].items[0].field('name').value}]", ns)).isEqualTo("[]");
    }

    @Test
    void 式の中の波かっこや文字列の閉じかっこで途切れない() {
        assertThat(evaluator.interpolate("${'}' + 'a'}", Map.of())).isEqualTo("}a");
        assertThat(evaluator.interpolate("${{'k': 'v'}['k']}!", Map.of())).isEqualTo("v!");
        assertThat(evaluator.interpolate("a ${'x'} b ${'y'}", Map.of())).isEqualTo("a x b y");
        assertThat(evaluator.interpolate("閉じていない ${'x'", Map.of())).isEqualTo("閉じていない ${'x'");
    }

    @Test
    void 評価に失敗した式は知らせを受けて空にできる() {
        java.util.List<String> errors = new java.util.ArrayList<>();
        String result = evaluator.interpolate("a${contains(}b", Map.of(), errors::add);

        assertThat(result).isEqualTo("ab");
        assertThat(errors).singleElement().asString().contains("contains(");
    }

    @Test
    void 出力は上限の長さで切り詰められる() {
        String longValue = "a".repeat(20_000);

        String result = evaluator.interpolate("${value}", Map.of("value", longValue));

        assertThat(result).hasSize(10_001).endsWith("…");
    }
}

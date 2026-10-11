package jp.tubeboard.features.lives.venueform.render;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.export.context.CanvasContext.FieldRef;
import jp.tubeboard.features.lives.export.context.CanvasContext.GroupRef;
import jp.tubeboard.features.lives.export.context.CanvasContext.ItemRef;
import jp.tubeboard.features.lives.export.context.CanvasException;
import jp.tubeboard.features.lives.export.context.ExpressionEvaluator;

class ConditionEvaluatorTest {

    private final ConditionEvaluator conditions = new ConditionEvaluator(new ExpressionEvaluator());

    private final Map<String, Object> namespace = Map.of(
            "fields", Map.of(
                    "parts", new FieldRef("Bass / Vocal", List.of("Bass", "Vocal"), false),
                    "pa", new FieldRef("有", List.of("有"), false)));

    @Test
    void 条件が空なら常に描く() {
        assertThat(conditions.passes(null, namespace)).isTrue();
        assertThat(conditions.passes("  ", namespace)).isTrue();
    }

    @Test
    void 選択肢を含むかどうかで判定できる() {
        assertThat(conditions.passes("contains(fields['parts'].values, 'Bass')", namespace)).isTrue();
        assertThat(conditions.passes("contains(fields['parts'].values, 'Drum')", namespace)).isFalse();
    }

    @Test
    void ドル記号の波かっこで囲んでも同じに扱う() {
        assertThat(conditions.passes("${fields['pa'].value == '有'}", namespace)).isTrue();
        assertThat(conditions.passes("${fields['pa'].value == '無'}", namespace)).isFalse();
    }

    @Test
    void 画面の条件作成補助が作るグループ内の条件を評価できる() {
        ItemRef bass = new ItemRef(0, "", Map.of("member-parts",
                new FieldRef("Bass", List.of("Bass"), false)), Map.of());
        ItemRef vocal = new ItemRef(1, "", Map.of("member-parts",
                new FieldRef("Vocal", List.of("Vocal"), false)), Map.of());
        Map<String, Object> ns = Map.of("groups", Map.of("members", new GroupRef(List.of(bass, vocal), 2)),
                "fields", Map.of("note", new FieldRef("", List.of(), true)));

        assertThat(conditions.passes(
                "${count(filter(groups['members'].items, (m) -> contains(m.field('member-parts').values, 'Bass'))) > 0}",
                ns)).isTrue();
        assertThat(conditions.passes(
                "${count(filter(groups['members'].items, (m) -> contains(m.field('member-parts').values, 'Drum'))) > 0}",
                ns)).isFalse();
        assertThat(conditions.passes("${count(fields['note'].values) > 0}", ns)).isFalse();
        assertThat(conditions.passes("${contains(fields['missing'].values, 'x')}", ns)).isFalse();
        assertThat(conditions.passes("${fields['x'].value == 'B.D 22\"'}", Map.of("fields",
                Map.of("x", new FieldRef("B.D 22\"", List.of("B.D 22\""), false))))).isTrue();
    }

    @Test
    void 何件目かを指定した条件は件数が足りなければエラーにせず偽にする() {
        ItemRef first = new ItemRef(0, "", Map.of("song-parts",
                new FieldRef("Vocal", List.of("Vocal"), false)), Map.of());
        ItemRef second = new ItemRef(1, "", Map.of("song-parts",
                new FieldRef("Bass", List.of("Bass"), false)), Map.of());
        Map<String, Object> ns = Map.of("groups", Map.of("setlist", new GroupRef(List.of(first, second), 2)));

        assertThat(conditions.passes(
                "${count(groups['setlist'].items) >= 2 && contains(groups['setlist'].items[1].field('song-parts').values, 'Bass')}",
                ns)).isTrue();
        assertThat(conditions.passes(
                "${count(groups['setlist'].items) >= 1 && contains(groups['setlist'].items[0].field('song-parts').values, 'Bass')}",
                ns)).isFalse();
        assertThat(conditions.passes(
                "${count(groups['setlist'].items) >= 5 && contains(groups['setlist'].items[4].field('song-parts').values, 'Bass')}",
                ns)).isFalse();
    }

    @Test
    void はいいいえの両方を判定できる() {
        Map<String, Object> ns = Map.of("fields", Map.of(
                "on", new FieldRef("true", List.of("true"), false),
                "off", new FieldRef("false", List.of("false"), false),
                "blank", new FieldRef("", List.of(), true)));

        assertThat(conditions.passes("${fields['off'].value == 'false'}", ns)).isTrue();
        assertThat(conditions.passes("${fields['on'].value == 'false'}", ns)).isFalse();
        // 未回答は「いいえ」とはみなさない
        assertThat(conditions.passes("${fields['blank'].value == 'false'}", ns)).isFalse();
    }

    @Test
    void 真偽以外の値も真か偽かに直す() {
        assertThat(ConditionEvaluator.truthy("false")).isFalse();
        assertThat(ConditionEvaluator.truthy("0")).isFalse();
        assertThat(ConditionEvaluator.truthy("")).isFalse();
        assertThat(ConditionEvaluator.truthy(null)).isFalse();
        assertThat(ConditionEvaluator.truthy(List.of())).isFalse();
        assertThat(ConditionEvaluator.truthy("有")).isTrue();
        assertThat(ConditionEvaluator.truthy(2)).isTrue();
        assertThat(ConditionEvaluator.truthy(List.of("a"))).isTrue();
    }

    @Test
    void 書き間違えた式は例外にして呼び出し側が警告にできる() {
        assertThatThrownBy(() -> conditions.passes("contains(fields['parts'].values,", namespace))
                .isInstanceOf(CanvasException.class);
    }
}

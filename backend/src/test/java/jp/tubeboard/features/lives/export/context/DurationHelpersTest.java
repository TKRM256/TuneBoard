package jp.tubeboard.features.lives.export.context;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.export.context.CanvasContext.FieldRef;
import jp.tubeboard.features.lives.export.context.CanvasContext.GroupRef;
import jp.tubeboard.features.lives.export.context.CanvasContext.ItemRef;
import jp.tubeboard.features.lives.service.DurationFormat;

class DurationHelpersTest {

    private final ExpressionEvaluator evaluator = new ExpressionEvaluator();

    private static ItemRef song(int index, String duration) {
        return new ItemRef(index, "song-entry",
                Map.of("song-duration", new FieldRef(duration, duration.isEmpty() ? List.of() : List.of(duration),
                        duration.isEmpty())),
                Map.of());
    }

    @Test
    void 演奏時間の書式を判定できる() {
        assertThat(DurationFormat.isValid("3:45")).isTrue();
        assertThat(DurationFormat.isValid("12:05")).isTrue();
        assertThat(DurationFormat.isValid("3:60")).isFalse();
        assertThat(DurationFormat.isValid("3分45秒")).isFalse();
        assertThat(DurationFormat.isValid("")).isFalse();
        assertThat(DurationFormat.format(125)).isEqualTo("2:05");
    }

    @Test
    void グループの演奏時間を合計できる() {
        GroupRef setlist = new GroupRef(List.of(song(0, "3:45"), song(1, ""), song(2, "4:20"), song(3, "壊れた値")), 4);
        Map<String, Object> ns = Map.of("groups", Map.of("setlist", setlist));

        assertThat(evaluator.interpolate("${sumDuration(groups['setlist'], 'song-duration')}", ns))
                .isEqualTo("8:05");
    }

    @Test
    void 秒との変換ができる() {
        assertThat(evaluator.interpolate("${durationSeconds('1:30')}", Map.of())).isEqualTo("90");
        assertThat(evaluator.interpolate("${formatDuration(durationSeconds('1:30') * 2)}", Map.of()))
                .isEqualTo("3:00");
    }
}

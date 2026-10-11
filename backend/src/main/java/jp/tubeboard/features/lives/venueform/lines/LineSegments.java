package jp.tubeboard.features.lives.venueform.lines;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** 検出した線分（ピクセルや pt などの絶対座標）をまとめ、比率の座標の罫線にする。 */
final class LineSegments {

    /** 絶対座標の線分。axis は {@link RuledLine#HORIZONTAL} か {@link RuledLine#VERTICAL}。 */
    record Segment(String axis, double pos, double from, double to) {

        double length() {
            return to - from;
        }
    }

    private LineSegments() {
    }

    /**
     * 同じ直線上（pos の差が posTolerance 以内）で、途切れが gapTolerance 以内の線分を 1 本につなぐ。
     * 表の罫線がセルごとに分かれて描かれていたり、かすれて途切れていたりしても 1 本として扱うため。
     */
    static List<Segment> merge(List<Segment> segments, double posTolerance, double gapTolerance) {
        // つないだ結果がさらに別の線分とつながることがあるので、本数が減らなくなるまで繰り返す
        List<Segment> current = segments;
        while (true) {
            List<Segment> next = mergeOnce(current, posTolerance, gapTolerance);
            if (next.size() == current.size()) return next;
            current = next;
        }
    }

    private static List<Segment> mergeOnce(List<Segment> segments, double posTolerance, double gapTolerance) {
        List<Segment> out = new ArrayList<>();
        for (String axis : List.of(RuledLine.HORIZONTAL, RuledLine.VERTICAL)) {
            List<Segment> sorted = segments.stream()
                    .filter(s -> s.axis().equals(axis))
                    .sorted(Comparator.comparingDouble(Segment::pos).thenComparingDouble(Segment::from))
                    .toList();
            List<Segment> merged = new ArrayList<>();
            for (Segment segment : sorted) {
                int target = findJoinable(merged, segment, posTolerance, gapTolerance);
                if (target < 0) {
                    merged.add(segment);
                } else {
                    merged.set(target, join(merged.get(target), segment));
                }
            }
            out.addAll(merged);
        }
        return out;
    }

    private static int findJoinable(List<Segment> merged, Segment segment, double posTolerance, double gapTolerance) {
        for (int i = merged.size() - 1; i >= 0; i--) {
            Segment candidate = merged.get(i);
            double diff = segment.pos() - candidate.pos();
            // pos の昇順に並べているので、十分離れたらそれより前は見なくてよい
            if (diff > posTolerance * 4) break;
            if (Math.abs(diff) > posTolerance) continue;
            boolean touches = segment.from() <= candidate.to() + gapTolerance
                    && candidate.from() <= segment.to() + gapTolerance;
            if (touches) return i;
        }
        return -1;
    }

    private static Segment join(Segment a, Segment b) {
        double lengthA = a.length();
        double lengthB = b.length();
        // 位置は長さで重み付けした平均にする（長い線の位置を優先）
        double pos = lengthA + lengthB > 0
                ? (a.pos() * lengthA + b.pos() * lengthB) / (lengthA + lengthB)
                : (a.pos() + b.pos()) / 2;
        return new Segment(a.axis(), pos, Math.min(a.from(), b.from()), Math.max(a.to(), b.to()));
    }

    /** 絶対座標を、幅 width・高さ height に対する比率に直す。 */
    static List<RuledLine> normalize(List<Segment> segments, double width, double height) {
        return segments.stream()
                .map(s -> RuledLine.HORIZONTAL.equals(s.axis())
                        ? new RuledLine(s.axis(), round(s.pos() / height), round(s.from() / width), round(s.to() / width))
                        : new RuledLine(s.axis(), round(s.pos() / width), round(s.from() / height), round(s.to() / height)))
                .toList();
    }

    private static double round(double value) {
        return Math.round(Math.max(0, Math.min(1, value)) * 100000) / 100000.0;
    }
}

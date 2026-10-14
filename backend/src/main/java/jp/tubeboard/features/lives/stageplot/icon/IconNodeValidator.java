package jp.tubeboard.features.lives.stageplot.icon;

import java.util.List;
import java.util.Set;

/** 画面から送られてきたアイコンの図形データの上限チェック。 */
public final class IconNodeValidator {

    private static final int MAX_NAME = 128;
    private static final int MAX_NODES = 64;
    private static final int MAX_ATTRS = 20;
    private static final int MAX_ATTR_LENGTH = 4_000;
    private static final Set<String> TAGS = Set.of("path", "circle", "ellipse", "rect", "line", "polyline",
            "polygon");

    private IconNodeValidator() {
    }

    /** @return 問題があれば理由、無ければ null */
    public static String check(String iconName, List<IconNode> nodes) {
        if (iconName != null && iconName.length() > MAX_NAME) {
            return "アイコン名が長すぎます";
        }
        if (nodes == null) {
            return null;
        }
        if (nodes.size() > MAX_NODES) {
            return "アイコンの図形が多すぎます";
        }
        for (IconNode node : nodes) {
            if (node == null || node.tag() == null || !TAGS.contains(node.tag())) {
                return "アイコンの図形が正しくありません";
            }
            if (node.attrs() == null) {
                continue;
            }
            if (node.attrs().size() > MAX_ATTRS) {
                return "アイコンの図形が正しくありません";
            }
            for (Object value : node.attrs().values()) {
                if (value != null && value.toString().length() > MAX_ATTR_LENGTH) {
                    return "アイコンの図形が大きすぎます";
                }
            }
        }
        return null;
    }
}

package jp.tubeboard.features.lives.venueform.template;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;

/**
 * フォームを、書式に並べる塊（見出し + 中身 1 つ）の列に直す。並びはフォームの順のまま。
 * 見出しのない項目が続く分は 1 つの「項目 / 内容」の表にまとめ、繰り返しは 1 つの表、配置図は 1 枚の図にする。
 * 隠した項目は回答が無いので入れない。
 */
final class FormTemplateContent {

    static final String SECTION = "SECTION";
    static final String GROUP = "REPEATABLE_GROUP";
    static final String STAGE_PLOT = "STAGE_PLOT";

    sealed interface Body {
    }

    record Fields(List<FormBlockResponse> fields) implements Body {
    }

    record Group(FormBlockResponse group) implements Body {
    }

    record StagePlot(FormBlockResponse field) implements Body {
    }

    /** @param heading 上に添える見出し。無ければ null */
    record Unit(String heading, Body body) {
    }

    private final List<Unit> units = new ArrayList<>();
    private final List<FormBlockResponse> pending = new ArrayList<>();
    private String heading;

    private FormTemplateContent() {
    }

    static List<Unit> of(SettingSheetConfigResponse config) {
        FormTemplateContent content = new FormTemplateContent();
        if (config != null) {
            content.walk(config.blocks());
            content.flush();
        }
        return content.units;
    }

    private void walk(List<FormBlockResponse> blocks) {
        if (blocks == null) return;
        for (FormBlockResponse block : blocks) {
            if (block == null || Boolean.TRUE.equals(block.hidden()) || block.type() == null) continue;
            switch (block.type()) {
                case SECTION -> {
                    flush();
                    // 中身のない見出しが続いたときは、外側の見出しも残す
                    heading = heading == null ? labelOf(block) : join(heading, labelOf(block));
                    walk(block.fields());
                    flush();
                }
                case GROUP -> {
                    flush();
                    if (!leafFields(block).isEmpty() || !childGroups(block).isEmpty()) {
                        units.add(new Unit(join(takeHeading(), labelOf(block)), new Group(block)));
                    }
                }
                case STAGE_PLOT -> {
                    flush();
                    units.add(new Unit(join(takeHeading(), labelOf(block)), new StagePlot(block)));
                }
                default -> pending.add(block);
            }
        }
    }

    private void flush() {
        if (pending.isEmpty()) return;
        units.add(new Unit(takeHeading(), new Fields(List.copyOf(pending))));
        pending.clear();
    }

    private String takeHeading() {
        String taken = heading;
        heading = null;
        return taken;
    }

    /** 繰り返しの 1 件に入る項目。バリエーションがあれば全部を合わせ、同じ項目は 1 回だけ。見出しの中も入れる。 */
    static List<FormBlockResponse> leafFields(FormBlockResponse group) {
        Map<String, FormBlockResponse> out = new LinkedHashMap<>();
        for (List<FormBlockResponse> fields : fieldLists(group)) {
            collect(fields, out, false);
        }
        return List.copyOf(out.values());
    }

    /** 繰り返しの中の繰り返し（使うマイクなど）。 */
    static List<FormBlockResponse> childGroups(FormBlockResponse group) {
        Map<String, FormBlockResponse> out = new LinkedHashMap<>();
        for (List<FormBlockResponse> fields : fieldLists(group)) {
            collect(fields, out, true);
        }
        return List.copyOf(out.values());
    }

    private static List<List<FormBlockResponse>> fieldLists(FormBlockResponse group) {
        // バリエーションがあれば、1 件の項目はどれかのバリエーションのもの（FormBlockResponse#itemFields と同じ）
        if (group.variants() == null || group.variants().isEmpty()) {
            return List.of(group.fields() == null ? List.of() : group.fields());
        }
        List<List<FormBlockResponse>> lists = new ArrayList<>();
        for (VariantResponse variant : group.variants()) {
            if (variant != null && variant.fields() != null) lists.add(variant.fields());
        }
        return lists;
    }

    private static void collect(List<FormBlockResponse> blocks, Map<String, FormBlockResponse> out, boolean groups) {
        if (blocks == null) return;
        for (FormBlockResponse block : blocks) {
            if (block == null || Boolean.TRUE.equals(block.hidden()) || block.type() == null || block.id() == null) continue;
            if (SECTION.equals(block.type())) {
                collect(block.fields(), out, groups);
            } else if (GROUP.equals(block.type()) == groups && !STAGE_PLOT.equals(block.type())) {
                out.putIfAbsent(block.id(), block);
            }
        }
    }

    static String labelOf(FormBlockResponse block) {
        return block.label() == null || block.label().isBlank() ? null : block.label().trim();
    }

    private static String join(String outer, String inner) {
        if (outer == null) return inner;
        if (inner == null || inner.equals(outer)) return outer;
        return outer + " / " + inner;
    }
}

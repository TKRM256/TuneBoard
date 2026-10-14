package jp.tubeboard.features.lives.venueform.template;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;

/** バンドの既定とは関係のない、変わった形のフォームの見本。テンプレートの並べ方を確かめるのに使う。 */
final class OddForms {

    record Paper(String name, float widthMm, float heightMm) {
        @Override
        public String toString() {
            return name;
        }
    }

    static final List<Paper> PAPERS = List.of(
            new Paper("A4縦", 210, 297),
            new Paper("A4横", 297, 210),
            new Paper("B4横", 364, 257),
            new Paper("A5縦", 148, 210),
            new Paper("A3縦", 297, 420),
            new Paper("細長い", 100, 300),
            new Paper("はがき横", 148, 100));

    private OddForms() {
    }

    /** 名前 → フォーム。並びは確かめる順。 */
    static Map<String, SettingSheetConfigResponse> all() {
        Map<String, SettingSheetConfigResponse> forms = new LinkedHashMap<>();
        forms.put("空のフォーム", form());
        forms.put("見出しだけ", form(section("s1", "受付"), section("s2", "当日", section("s3", "リハ"))));
        forms.put("項目が60個", form(IntStream.rangeClosed(1, 60)
                .mapToObj(i -> leaf("f" + i, i % 7 == 0 ? "LONG_TEXT" : "SHORT_TEXT", "質問" + i))
                .toArray(FormBlockResponse[]::new)));
        forms.put("入れ子の見出し", form(
                section("a", "第一部", leaf("a1", "SHORT_TEXT", "代表者"),
                        section("b", "連絡先", leaf("b1", "SHORT_TEXT", "電話"),
                                section("c", "緊急時", leaf("c1", "SHORT_TEXT", "保護者"))))));
        forms.put("列が15個の繰り返し", form(group("wide", "機材リスト", IntStream.rangeClosed(1, 15)
                .mapToObj(i -> leaf("w" + i, i == 3 ? "LONG_TEXT" : "SHORT_TEXT", "列" + i))
                .toArray(FormBlockResponse[]::new))));
        forms.put("バリエーションと入れ子", form(groupWithVariants("program", "演目",
                variant("v-dance", "ダンス", leaf("d-title", "SHORT_TEXT", "演目名"), leaf("d-people", "SHORT_TEXT", "人数"),
                        group("d-music", "音源", leaf("m-file", "SHORT_TEXT", "ファイル名"), leaf("m-len", "DURATION", "尺"))),
                variant("v-talk", "トーク", leaf("t-theme", "LONG_TEXT", "テーマ"), leaf("d-title", "SHORT_TEXT", "演目名")))));
        forms.put("繰り返しが10個", form(IntStream.rangeClosed(1, 10)
                .mapToObj(i -> group("g" + i, "グループ" + i, leaf("g" + i + "-a", "SHORT_TEXT", "名前"),
                        leaf("g" + i + "-b", "SINGLE_SELECT", "区分")))
                .toArray(FormBlockResponse[]::new)));
        forms.put("長い項目名", form(
                leaf("long1", "SHORT_TEXT", "とても長い項目名".repeat(12)),
                group("long-g", "長い名前の繰り返し".repeat(6),
                        leaf("lg1", "SHORT_TEXT", "列の見出しもとても長くて読みにくい".repeat(3)),
                        leaf("lg2", "LONG_TEXT", "備考"))));
        forms.put("配置図", form(leaf("p1", "SHORT_TEXT", "団体名"), leaf("plot", "STAGE_PLOT", "立ち位置"),
                group("acts", "演目", leaf("act", "SHORT_TEXT", "演目名"), leaf("act-plot", "STAGE_PLOT", "配置"))));
        forms.put("隠した項目", form(hidden(leaf("h1", "SHORT_TEXT", "隠した質問")), leaf("v1", "SHORT_TEXT", "見える質問"),
                hidden(group("hg", "隠した繰り返し", leaf("hg1", "SHORT_TEXT", "中身"))),
                group("vg", "見える繰り返し", leaf("vg1", "SHORT_TEXT", "見える列"), hidden(leaf("vg2", "SHORT_TEXT", "隠した列")))));
        forms.put("中が繰り返しだけ", form(group("outer", "外側", group("inner", "内側", leaf("in1", "SHORT_TEXT", "名前")))));
        forms.put("全部入り", form(
                leaf("x1", "SHORT_TEXT", "団体名"), leaf("x2", "BOOLEAN", "初出演"), leaf("x3", "MULTI_SELECT", "希望"),
                section("xs", "出演者", group("xg", "メンバー", leaf("xg1", "SHORT_TEXT", "名前"), leaf("xg2", "SINGLE_SELECT", "学年"))),
                leaf("x4", "LONG_TEXT", "備考"), leaf("xplot", "STAGE_PLOT", "配置"),
                group("xs2", "曲", leaf("song", "SONG", "曲"), leaf("x5", "DURATION", "尺"), leaf("x6", "LONG_TEXT", "照明"),
                        leaf("x7", "LONG_TEXT", "音響"), leaf("x8", "SHORT_TEXT", "きっかけ"), leaf("x9", "CHECKBOX", "同意"),
                        leaf("x10", "SHORT_TEXT", "メモ1"), leaf("x11", "SHORT_TEXT", "メモ2"))));
        forms.put("記号入りの項目名", form(
                leaf("sym1", "SHORT_TEXT", "It's \"quoted\" ${x} {a} \\ 終"),
                group("sym-g", "記号}の'繰り返し", IntStream.rangeClosed(1, 12)
                        .mapToObj(i -> leaf("sym-g" + i, "SHORT_TEXT", i % 2 == 0 ? "列}" + i + "'${y}" : "列\\" + i))
                        .toArray(FormBlockResponse[]::new))));
        forms.put("項目名が空", form(leaf("e1", "SHORT_TEXT", ""), section("es", "", leaf("e2", "SHORT_TEXT", " ")),
                group("eg", "", leaf("eg1", "SHORT_TEXT", ""), leaf("eg2", "BOOLEAN", ""))));
        forms.put("最低20件の繰り返し", form(minItems(group("many", "名簿", leaf("many1", "SHORT_TEXT", "名前")), 20),
                leaf("after", "SHORT_TEXT", "後ろの項目")));
        forms.put("繰り返しの中の見出しと3段の入れ子", form(group("l1", "一段目",
                section("l1s", "中の見出し", leaf("l1a", "SHORT_TEXT", "名前")),
                group("l2", "二段目", leaf("l2a", "SHORT_TEXT", "曲"),
                        group("l3", "三段目", leaf("l3a", "SHORT_TEXT", "担当"))))));
        forms.put("中が配置図だけの繰り返し", form(group("only-plot", "配置", leaf("op", "STAGE_PLOT", "図")),
                leaf("tail", "SHORT_TEXT", "最後")));
        return forms;
    }

    static FormBlockResponse minItems(FormBlockResponse group, int count) {
        return new FormBlockResponse(group.id(), group.type(), group.label(), "", false, true, true, false, false,
                "plain", "outline", List.of(), count, "", "", "", group.fields(), new LayoutResponse("full", null, null),
                null, "", List.of());
    }

    /** 隠していない葉の項目の ID（表のどこかに必ず出ているはずのもの）。 */
    static List<String> visibleLeafIds(SettingSheetConfigResponse config) {
        List<String> out = new ArrayList<>();
        collectLeaves(config.blocks(), out);
        return out;
    }

    private static void collectLeaves(List<FormBlockResponse> blocks, List<String> out) {
        if (blocks == null) return;
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden()) || "STAGE_PLOT".equals(block.type())) continue;
            if ("SECTION".equals(block.type()) || "REPEATABLE_GROUP".equals(block.type())) {
                collectLeaves(block.fields(), out);
                if (block.variants() != null) {
                    for (VariantResponse variant : block.variants()) collectLeaves(variant.fields(), out);
                }
            } else if (!out.contains(block.id())) {
                out.add(block.id());
            }
        }
    }

    static List<String> hiddenIds(SettingSheetConfigResponse config) {
        List<String> out = new ArrayList<>();
        collectHidden(config.blocks(), out, false);
        return out;
    }

    private static void collectHidden(List<FormBlockResponse> blocks, List<String> out, boolean underHidden) {
        if (blocks == null) return;
        for (FormBlockResponse block : blocks) {
            boolean hidden = underHidden || Boolean.TRUE.equals(block.hidden());
            if (hidden) out.add(block.id());
            collectHidden(block.fields(), out, hidden);
        }
    }

    static SettingSheetConfigResponse form(FormBlockResponse... blocks) {
        return new SettingSheetConfigResponse("フォーム", "", "送信", true, List.of(blocks));
    }

    static FormBlockResponse leaf(String id, String type, String label) {
        List<String> options = type.endsWith("SELECT") || "CHECKBOX".equals(type) ? List.of("あ", "い", "う") : List.of();
        return block(id, type, label, false, options, List.of(), List.of());
    }

    static FormBlockResponse section(String id, String label, FormBlockResponse... fields) {
        return block(id, "SECTION", label, false, List.of(), List.of(fields), List.of());
    }

    static FormBlockResponse group(String id, String label, FormBlockResponse... fields) {
        return block(id, "REPEATABLE_GROUP", label, false, List.of(), List.of(fields), List.of());
    }

    static FormBlockResponse groupWithVariants(String id, String label, VariantResponse... variants) {
        return block(id, "REPEATABLE_GROUP", label, false, List.of(), List.of(), List.of(variants));
    }

    static VariantResponse variant(String id, String label, FormBlockResponse... fields) {
        return new VariantResponse(id, label, List.of(fields));
    }

    static FormBlockResponse hidden(FormBlockResponse block) {
        return block(block.id(), block.type(), block.label(), true, block.options(), block.fields(), block.variants());
    }

    private static FormBlockResponse block(String id, String type, String label, boolean hidden, List<String> options,
            List<FormBlockResponse> fields, List<VariantResponse> variants) {
        return new FormBlockResponse(id, type, label, "", hidden, true, true, false, false, "plain", "outline",
                options, 0, "", "", "", fields, new LayoutResponse("full", null, null), null, "", variants);
    }
}

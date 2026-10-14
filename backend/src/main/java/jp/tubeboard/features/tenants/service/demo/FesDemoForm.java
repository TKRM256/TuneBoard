package jp.tubeboard.features.tenants.service.demo;

import static jp.tubeboard.features.tenants.service.demo.DemoForm.answer;
import static jp.tubeboard.features.tenants.service.demo.DemoForm.group;
import static jp.tubeboard.features.tenants.service.demo.DemoForm.item;
import static jp.tubeboard.features.tenants.service.demo.DemoForm.pick;

import java.util.ArrayList;
import java.util.List;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;

/**
 * 合同フェスの出演エントリー。セクションを使わずに項目を並べ、出演者の中に持ち込み機材の繰り返しを入れ子にし、
 * 演目は「曲・トーク・転換」で書く項目が変わる。出演順は管理者だけが書く。
 */
public final class FesDemoForm implements DemoForm {

    private static final String SETTINGS = """
            {
              "title": "出演エントリー（合同フェス）",
              "description": "",
              "submitButtonLabel": "エントリーする",
              "publicSubmissionEnabled": true,
              "blocks": [
                { "id": "act-name", "type": "SHORT_TEXT", "label": "出演名", "required": true,
                  "publicVisible": true, "adminVisible": true, "layout": { "width": "two-thirds" } },
                { "id": "act-type", "type": "SINGLE_SELECT", "label": "出演形態", "adminVisible": true, "layout": { "width": "third" },
                  "options": ["バンド", "弾き語り", "DJ", "ダンス", "その他"] },
                { "id": "set-length", "type": "DURATION", "label": "持ち時間", "adminVisible": true, "layout": { "width": "third" } },
                { "id": "agreements", "type": "CHECKBOX", "label": "確認事項",
                  "options": ["機材の持ち込みは事前に申請する", "持ち時間を守る", "撤収まで責任を持つ"] },
                { "id": "performers", "type": "REPEATABLE_GROUP", "label": "出演者", "minItems": 1,
                  "addButtonLabel": "出演者を追加", "entryTitle": "出演者", "titleSourceFieldId": "performer-name", "fields": [
                  { "id": "performer-name", "type": "SHORT_TEXT", "label": "名前", "required": true, "layout": { "width": "half" } },
                  { "id": "performer-role", "type": "SHORT_TEXT", "label": "担当", "layout": { "width": "half" } },
                  { "id": "gear", "type": "REPEATABLE_GROUP", "label": "持ち込み機材",
                    "addButtonLabel": "機材を追加", "entryTitle": "機材", "titleSourceFieldId": "gear-name", "fields": [
                    { "id": "gear-name", "type": "SHORT_TEXT", "label": "機材名", "layout": { "width": "two-thirds" } },
                    { "id": "gear-power", "type": "BOOLEAN", "label": "電源が必要", "layout": { "width": "third" } }
                  ] }
                ] },
                { "id": "program", "type": "REPEATABLE_GROUP", "label": "演目", "addButtonLabel": "演目を追加",
                  "entryTitle": "演目", "variants": [
                  { "id": "program-song", "label": "曲", "fields": [
                    { "id": "program-song-title", "type": "SONG", "label": "楽曲" },
                    { "id": "program-song-length", "type": "DURATION", "label": "長さ", "layout": { "width": "third" } }
                  ] },
                  { "id": "program-talk", "label": "トーク", "fields": [
                    { "id": "program-talk-topic", "type": "SHORT_TEXT", "label": "話す内容" }
                  ] },
                  { "id": "program-change", "label": "転換", "fields": [
                    { "id": "program-change-note", "type": "LONG_TEXT", "label": "転換の内容" }
                  ] }
                ] },
                { "id": "stage-layout", "type": "STAGE_PLOT", "label": "立ち位置" },
                { "id": "merch", "type": "BOOLEAN", "label": "物販あり", "adminVisible": true },
                { "id": "merch-detail", "type": "LONG_TEXT", "label": "物販の内容" },
                { "id": "running-order", "type": "SHORT_TEXT", "label": "出演順", "adminOnly": true, "adminVisible": true }
              ]
            }
            """;

    private static final List<String> ACTS = List.of("夜明けのサイレン", "DJ MOCHI", "弾き語り 小春", "Crew Ninety",
            "放課後アンサンブル", "とても長い出演名のユニット・アンド・ザ・スペシャルゲスト");
    private static final List<String> TYPES = List.of("バンド", "DJ", "弾き語り", "ダンス", "バンド", "その他");
    private static final List<String> PEOPLE = List.of("ケン", "ミホ", "タクミ", "ユウナ", "リョウ", "アヤ", "ソウタ");
    private static final List<String> ROLES = List.of("Vo", "Gt", "Ba", "Dr", "DJ", "Key", "ダンス");
    private static final List<String> GEAR = List.of("エフェクターボード", "DJコントローラー", "アコースティックギター",
            "シンセサイザー", "スネア");
    private static final List<List<String>> SONGS = List.of(List.of("夜に駆ける", "YOASOBI"),
            List.of("Pretender", "Official髭男dism"), List.of("小さな恋のうた", "MONGOL800"));
    private static final List<String> TALKS = List.of("自己紹介", "物販の案内", "次の曲の紹介");

    @Override
    public String settingsJson() {
        return SETTINGS;
    }

    @Override
    public DemoStagePlots.Kind stageKind() {
        return DemoStagePlots.Kind.FES;
    }

    @Override
    public String recordLabel(int liveIndex, int index) {
        return pick(ACTS, liveIndex * 2 + index);
    }

    @Override
    public PublicSettingSheetSubmissionRequest payload(int liveIndex, int index) {
        int seed = liveIndex * 5 + index;
        boolean merch = seed % 2 == 1;
        List<String> agreements = seed % 3 == 0
                ? List.of("機材の持ち込みは事前に申請する", "持ち時間を守る", "撤収まで責任を持つ")
                : List.of("持ち時間を守る");
        return new PublicSettingSheetSubmissionRequest(List.of(
                answer("act-name", recordLabel(liveIndex, index)),
                answer("act-type", pick(TYPES, seed)),
                answer("set-length", "%d:00".formatted(10 + (seed % 4) * 5)),
                answer("agreements", agreements.toArray(String[]::new)),
                group("performers", performers(seed)),
                group("program", program(seed)),
                answer("stage-layout", DemoStagePlots.value(DemoStagePlots.Kind.FES, seed)),
                answer("merch", Boolean.toString(merch)),
                answer("merch-detail", merch ? "Tシャツ 2,500円\nステッカー 300円" : "")), null);
    }

    /** 1〜4 人。機材を持ち込む人と持ち込まない人がいる。 */
    private static List<GroupItemRequest> performers(int seed) {
        List<GroupItemRequest> items = new ArrayList<>();
        int count = 1 + Math.floorMod(seed, 4);
        for (int i = 0; i < count; i++) {
            List<GroupItemRequest> gear = new ArrayList<>();
            for (int g = 0; g < (seed + i) % 3; g++) {
                gear.add(item(null, answer("gear-name", pick(GEAR, seed + i + g)),
                        answer("gear-power", Boolean.toString((seed + g) % 2 == 0))));
            }
            items.add(item(null, answer("performer-name", pick(PEOPLE, seed + i)), answer("performer-role", pick(ROLES, seed * 3 + i)),
                    group("gear", gear)));
        }
        return items;
    }

    /** 曲・トーク・転換を混ぜた 2〜5 個の演目。 */
    private static List<GroupItemRequest> program(int seed) {
        List<GroupItemRequest> items = new ArrayList<>();
        int count = 2 + Math.floorMod(seed, 4);
        for (int i = 0; i < count; i++) {
            switch ((seed + i) % 3) {
                case 0 -> {
                    List<String> song = pick(SONGS, seed + i);
                    items.add(item("program-song", answer("program-song-title", song.get(0), song.get(1)),
                            answer("program-song-length", "%d:%02d".formatted(3 + i % 2, (seed * 11 + i) % 60))));
                }
                case 1 -> items.add(item("program-talk", answer("program-talk-topic", pick(TALKS, seed + i))));
                default -> items.add(item("program-change", answer("program-change-note", "ドラムセットを入れ替える")));
            }
        }
        return items;
    }
}

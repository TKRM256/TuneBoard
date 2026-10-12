package jp.tubeboard.features.tenants.service.demo;

import static jp.tubeboard.features.tenants.service.demo.DemoForm.answer;
import static jp.tubeboard.features.tenants.service.demo.DemoForm.group;
import static jp.tubeboard.features.tenants.service.demo.DemoForm.item;
import static jp.tubeboard.features.tenants.service.demo.DemoForm.pick;

import java.util.ArrayList;
import java.util.List;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;

/** ダンス発表会の出演申込。団体の情報・出演者・使用音源を書く（曲名の欄やセットリストはない）。 */
public final class DanceDemoForm implements DemoForm {

    private static final String SETTINGS = """
            {
              "title": "出演申込（ダンス発表会）",
              "description": "",
              "submitButtonLabel": "申し込む",
              "publicSubmissionEnabled": true,
              "blocks": [
                { "id": "team", "type": "SECTION", "label": "団体情報", "fields": [
                  { "id": "team-name", "type": "SHORT_TEXT", "label": "団体名", "required": true },
                  { "id": "leader", "type": "SHORT_TEXT", "label": "代表者", "layout": { "width": "half" } },
                  { "id": "phone", "type": "SHORT_TEXT", "label": "連絡先", "layout": { "width": "half" } },
                  { "id": "genre", "type": "SINGLE_SELECT", "label": "ジャンル",
                    "options": ["ヒップホップ", "ジャズ", "K-POP", "バレエ", "その他"] },
                  { "id": "slot", "type": "SINGLE_SELECT", "label": "出演枠", "options": ["昼の部", "夜の部"] },
                  { "id": "lights", "type": "MULTI_SELECT", "label": "照明の希望",
                    "options": ["スポット", "ミラーボール", "ストロボ", "暗転スタート"] },
                  { "id": "props", "type": "BOOLEAN", "label": "小道具あり" }
                ] },
                { "id": "dancers", "type": "REPEATABLE_GROUP", "label": "出演者", "minItems": 1,
                  "addButtonLabel": "出演者を追加", "entryTitle": "出演者", "titleSourceFieldId": "dancer-name", "fields": [
                  { "id": "dancer-name", "type": "SHORT_TEXT", "label": "名前", "required": true },
                  { "id": "dancer-grade", "type": "SINGLE_SELECT", "label": "学年", "options": ["1年", "2年", "3年", "4年"] },
                  { "id": "dancer-pos", "type": "SINGLE_SELECT", "label": "立ち位置", "options": ["センター", "下手", "上手"] }
                ] },
                { "id": "tracks", "type": "REPEATABLE_GROUP", "label": "使用音源",
                  "addButtonLabel": "音源を追加", "entryTitle": "音源", "titleSourceFieldId": "track-title", "fields": [
                  { "id": "track-title", "type": "SHORT_TEXT", "label": "曲名" },
                  { "id": "track-time", "type": "DURATION", "label": "尺", "layout": { "width": "third" } },
                  { "id": "cue", "type": "SHORT_TEXT", "label": "きっかけ", "layout": { "width": "two-thirds" } }
                ] },
                { "id": "notes", "type": "LONG_TEXT", "label": "備考" }
              ]
            }
            """;

    private static final List<String> TEAMS = List.of("ステップスクエア", "Rhythm Nation", "ジャズダンス部 Lumière",
            "K-POPコピー Hana", "バレエ同好会 Pointe", "国際文化大学ストリートダンス愛好会ネクストジェネレーション");
    private static final List<String> LEADERS = List.of("山田 花子", "佐藤 一郎", "鈴木 あい", "高橋 そら");
    private static final List<String> GENRES = List.of("ヒップホップ", "ジャズ", "K-POP", "バレエ", "その他");
    private static final List<List<String>> LIGHTS = List.of(List.of("スポット"), List.of("ミラーボール", "ストロボ"),
            List.of(), List.of("スポット", "暗転スタート"), List.of("ストロボ", "スポット", "ミラーボール"));
    private static final List<String> DANCERS = List.of("あおい", "ひかる", "ミナミ・アレクサンドラ・ジョーンズ", "りく", "そら",
            "ゆい", "はると", "さくら", "れん");
    private static final List<String> GRADES = List.of("1年", "2年", "3年", "4年");
    private static final List<String> POSITIONS = List.of("センター", "下手", "上手");
    private static final List<String> TRACKS = List.of("オープニング Remix", "とても長い曲名のメドレー（Part 1〜3 ノンストップ）",
            "エンディング", "Interlude", "ソロパート");
    private static final List<String> CUES = List.of("暗転後に音先", "センターのポーズで", "", "全員が板付きになったら");
    private static final List<String> NOTES = List.of("", "ストロボは 2 曲目のサビだけ。", "袖からの出はけあり。\n小道具は上手に置く。");

    @Override
    public String settingsJson() {
        return SETTINGS;
    }

    @Override
    public String recordLabel(int liveIndex, int index) {
        return pick(TEAMS, liveIndex + index);
    }

    @Override
    public PublicSettingSheetSubmissionRequest payload(int liveIndex, int index) {
        int seed = liveIndex * 7 + index;
        List<String> lights = pick(LIGHTS, seed);
        return new PublicSettingSheetSubmissionRequest(List.of(
                answer("team-name", recordLabel(liveIndex, index)),
                answer("leader", pick(LEADERS, seed)),
                answer("phone", "090-0000-%04d".formatted(1000 + seed)),
                answer("genre", pick(GENRES, seed)),
                answer("slot", seed % 2 == 0 ? "昼の部" : "夜の部"),
                answer("lights", lights.toArray(String[]::new)),
                answer("props", Boolean.toString(seed % 3 == 0)),
                group("dancers", dancers(seed)),
                group("tracks", tracks(seed)),
                answer("notes", pick(NOTES, seed))), null);
    }

    /** 1〜6 人。6 人のときは、5 行しかない書式からあふれる。 */
    private static List<GroupItemRequest> dancers(int seed) {
        List<GroupItemRequest> items = new ArrayList<>();
        int count = 1 + Math.floorMod(seed, 6);
        for (int i = 0; i < count; i++) {
            items.add(item(null, answer("dancer-name", pick(DANCERS, seed + i)), answer("dancer-grade", pick(GRADES, seed + i)),
                    answer("dancer-pos", pick(POSITIONS, seed * 2 + i))));
        }
        return items;
    }

    /** 0〜3 曲。音源のない団体もある。 */
    private static List<GroupItemRequest> tracks(int seed) {
        List<GroupItemRequest> items = new ArrayList<>();
        int count = Math.floorMod(seed, 4);
        for (int i = 0; i < count; i++) {
            items.add(item(null, answer("track-title", pick(TRACKS, seed + i)),
                    answer("track-time", "%d:%02d".formatted(1 + (seed + i) % 5, (seed * 13 + i * 7) % 60)),
                    answer("cue", pick(CUES, seed + i))));
        }
        return items;
    }
}

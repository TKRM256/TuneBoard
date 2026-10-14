package jp.tubeboard.features.tenants.service.demo;

import static jp.tubeboard.features.tenants.service.demo.VenueLayoutBuilder.anyItemIncludes;
import static jp.tubeboard.features.tenants.service.demo.VenueLayoutBuilder.includes;
import static jp.tubeboard.features.tenants.service.demo.VenueLayoutBuilder.isTrue;
import static jp.tubeboard.features.tenants.service.demo.VenueLayoutBuilder.itemValue;

import java.util.List;

import jp.tubeboard.features.tenants.service.demo.VenueLayoutBuilder.Cell;
import jp.tubeboard.features.tenants.service.demo.VenueLayoutBuilder.Column;

/**
 * 開発用のダミーデータの会場書式。背景は resources/dev-seed/venue-forms の PDF（元の HTML は source/ にある）で、
 * 位置はその PDF の罫線（mm）に合わせてある。
 */
public final class DemoVenueLayouts {

    public static final float PAGE_WIDTH_MM = 209.9f;
    public static final float PAGE_HEIGHT_MM = 297f;

    private DemoVenueLayouts() {
    }

    /** 既定のバンド向けフォーム × サンプルホールの出演申込書（band-form.pdf） */
    static VenueLayoutBuilder band() {
        float[] rows = { 66.54f, 73.69f, 80.56f, 87.71f, 94.59f, 101.73f, 108.61f };
        String song = "${groups['setlist'].items[%d].field('song').values[";
        VenueLayoutBuilder layout = new VenueLayoutBuilder()
                .field("band-name", new Cell(38.23f, 30.30f, 195.92f, 38.23f), 11f, true, "middle")
                .text("${mapJoin(filter(groups['members'].items, (m) -> m.field('member-representative').value == 'true'),"
                        + " (m) -> m.field('member-name').value, '、')}", new Cell(38.23f, 38.23f, 131.89f, 46.43f), 10f,
                        "left", null)
                .field("submission-status", new Cell(155.97f, 38.23f, 195.92f, 46.43f), 10f, true, "middle")
                .table(rows, List.of(
                        new Column(22.36f, 55.17f, itemValue("members", "member-name")),
                        new Column(55.17f, 85.06f, itemValue("members", "member-parts"))), 8f)
                .table(rows, List.of(
                        new Column(96.44f, 161.79f, song + "0]}"),
                        new Column(161.79f, 195.92f, song + "1]}")), 8f)
                .stagePlot("stage-plot", new Cell(38.23f, 112.85f, 195.92f, 174.76f), "withBase")
                .field("detail", new Cell(38.23f, 179.25f, 195.92f, 201.22f), 9f, false, "top");
        float[] boxes = { 43.00f, 58.08f, 74.22f, 88.50f, 103.85f };
        List<String> parts = List.of("Vocal", "Guitar", "Bass", "Drum", "Keyboard");
        for (int i = 0; i < boxes.length; i++) {
            layout.check(boxes[i], 48.82f, 2.91f, anyItemIncludes("members", "member-parts", parts.get(i)));
        }
        return layout;
    }

    /** ダンス発表会の出演申込 × 出演申込書（dance-form.pdf） */
    static VenueLayoutBuilder dance() {
        VenueLayoutBuilder layout = new VenueLayoutBuilder()
                .field("team-name", new Cell(38.3f, 30.3f, 196f, 38.2f), 10f, true, "middle")
                .field("leader", new Cell(38.3f, 38.2f, 117.1f, 46.4f), 10f, true, "middle")
                .field("phone", new Cell(141.2f, 38.2f, 196f, 46.4f), 10f, true, "middle")
                .table(new float[] { 82.7f, 89.6f, 96.7f, 107.5f, 114.7f, 121.6f }, List.of(
                        new Column(23.2f, 56.3f, itemValue("dancers", "dancer-name")),
                        new Column(56.3f, 70.3f, itemValue("dancers", "dancer-grade")),
                        new Column(70.3f, 90.1f, itemValue("dancers", "dancer-pos"))), 8f)
                .table(new float[] { 84f, 93.5f, 102.8f, 112.3f, 121.6f }, List.of(
                        new Column(101.5f, 156.8f, itemValue("tracks", "track-title")),
                        new Column(156.8f, 170.1f, itemValue("tracks", "track-time")),
                        new Column(170.1f, 196f, itemValue("tracks", "cue"))), 8f)
                .field("notes", new Cell(38.3f, 125.8f, 196f, 156f), 9f, false, "top")
                .circle(42f, 55.2f, 55f, 61.5f, includes("slot", "昼の部"))
                .circle(62.5f, 55.2f, 75.5f, 61.5f, includes("slot", "夜の部"))
                .circle(144f, 55.2f, 152.5f, 61.5f, isTrue("props", true))
                .circle(158.5f, 55.2f, 167f, 61.5f, isTrue("props", false));
        float[] genreBoxes = { 43.0f, 68.93f, 85.6f, 102.8f, 119.73f };
        List<String> genres = List.of("ヒップホップ", "ジャズ", "K-POP", "バレエ", "その他");
        for (int i = 0; i < genreBoxes.length; i++) {
            layout.check(genreBoxes[i], 48.81f, 2.91f, includes("genre", genres.get(i)));
        }
        float[] lightBoxes = { 43.0f, 62.9f, 89.1f, 108.9f };
        List<String> lights = List.of("スポット", "ミラーボール", "ストロボ", "暗転スタート");
        for (int i = 0; i < lightBoxes.length; i++) {
            layout.check(lightBoxes[i], 65.0f, 2.91f, includes("lights", lights.get(i)));
        }
        return layout;
    }

    /** 合同フェスの出演エントリー × エントリーシート（fes-form.pdf） */
    static VenueLayoutBuilder fes() {
        float[] rows = { 82.68f, 89.56f, 96.71f, 103.59f, 110.73f };
        String song = "${groups['program'].items[%d].field('program-song-title').values[";
        VenueLayoutBuilder layout = new VenueLayoutBuilder()
                .field("act-name", new Cell(38.23f, 30.30f, 195.92f, 38.23f), 11f, true, "middle")
                .field("set-length", new Cell(38.23f, 46.43f, 131.89f, 54.37f), 10f, true, "middle")
                .field("running-order", new Cell(38.23f, 62.31f, 195.92f, 70.25f), 10f, true, "middle")
                .table(rows, List.of(
                        new Column(22.36f, 63.10f, itemValue("performers", "performer-name")),
                        new Column(63.10f, 85.06f, itemValue("performers", "performer-role"))), 8f)
                .table(rows, List.of(
                        new Column(96.44f, 152.80f, song + "0]}"),
                        new Column(152.80f, 182.96f, song + "1]}"),
                        new Column(182.96f, 195.92f, itemValue("program", "program-song-length"))), 8f)
                .stagePlot("stage-layout", new Cell(38.23f, 114.96f, 195.92f, 176.87f), "withBase")
                .circle(159.0f, 47.4f, 165.2f, 53.4f, isTrue("merch", true))
                .circle(171.3f, 47.4f, 177.5f, 53.4f, isTrue("merch", false));
        float[][] types = { { 42.76f, 52.28f }, { 61.45f, 74.15f }, { 83.32f, 86.95f }, { 96.13f, 105.56f },
                { 114.73f, 124.25f } };
        List<String> typeNames = List.of("バンド", "弾き語り", "DJ", "ダンス", "その他");
        for (int i = 0; i < types.length; i++) {
            layout.circle(types[i][0] - 1.8f, 39.3f, types[i][1] + 1.8f, 45.4f, includes("act-type", typeNames.get(i)));
        }
        float[] agreementBoxes = { 43.0f, 72.36f, 101.73f };
        List<String> agreements = List.of("機材の持ち込みは事前に申請する", "持ち時間を守る", "撤収まで責任を持つ");
        for (int i = 0; i < agreementBoxes.length; i++) {
            layout.check(agreementBoxes[i], 56.75f, 2.91f, includes("agreements", agreements.get(i)));
        }
        return layout;
    }
}

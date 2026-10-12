package jp.tubeboard.features.tenants.service.demo;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings.PaletteItem;
import jp.tubeboard.features.lives.stageplot.StagePlotValue;
import jp.tubeboard.features.lives.stageplot.StagePlotValue.PlotItem;
import jp.tubeboard.features.lives.stageplot.icon.IconNode;

/**
 * 開発用のダミーデータのステージ配置図：出演者が置けるアイコン（パレット）・下絵の画像・提出ごとの配置。
 * 楽器のアイコンは resources/dev-seed/instrument-icons.json（Qlementine Icons, MIT）から、人のアイコンは lucide（ISC）の user。
 */
public final class DemoStagePlots {

    public enum Kind { BAND, DANCE, FES }

    private record Spec(String id, String icon, String label, String color) {
    }

    private static final Map<Kind, List<Spec>> PALETTES = Map.of(
            Kind.BAND, List.of(new Spec("vo", "ql-microphone", "Vo", "#dc2626"), new Spec("gt", "ql-guitar-strat", "Gt", "#2563eb"),
                    new Spec("ba", "ql-bass", "Ba", "#16a34a"), new Spec("dr", "ql-drumkit", "Dr", "#9333ea"),
                    new Spec("key", "ql-piano", "Key", "#ea580c"), new Spec("amp", "ql-amp", "Amp", "#475569")),
            Kind.DANCE, List.of(new Spec("dancer", "user", "ダンサー", "#db2777"), new Spec("speaker", "ql-speaker", "スピーカー", "#475569")),
            Kind.FES, List.of(new Spec("vo", "ql-microphone", "Vo", "#dc2626"), new Spec("ag", "ql-guitar-folk", "AG", "#b45309"),
                    new Spec("dj", "ql-synthesizer", "DJ", "#0891b2"), new Spec("dr", "ql-drumkit", "Dr", "#9333ea"),
                    new Spec("speaker", "ql-speaker", "スピーカー", "#475569"), new Spec("sax", "ql-saxophone", "Sax", "#ca8a04")));

    /** lucide の user（ISC License） */
    private static final List<IconNode> USER = List.of(
            new IconNode("path", Map.of("d", "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2")),
            new IconNode("circle", Map.of("cx", "12", "cy", "7", "r", "4")));

    private static final ObjectMapper MAPPER = JsonMapper.builder().findAndAddModules().build();
    private static final Map<String, List<IconNode>> ICONS = loadIcons();

    private DemoStagePlots() {
    }

    public static StagePlotSettings settings(Kind kind, UUID baseAssetId) {
        List<PaletteItem> palette = PALETTES.get(kind).stream()
                .map(spec -> new PaletteItem(spec.id(), spec.icon(), spec.label(), spec.color(), nodes(spec.icon())))
                .toList();
        return new StagePlotSettings(baseAssetId, 1.6, kind == Kind.DANCE ? 0.07 : 0.09, palette);
    }

    /** 提出ごとの配置図の回答（JSON）。アイコンの数と位置は seed ごとに変える。 */
    public static String value(Kind kind, int seed) {
        List<Spec> palette = PALETTES.get(kind);
        int count = kind == Kind.DANCE ? 3 + Math.floorMod(seed, 5) : 2 + Math.floorMod(seed, palette.size());
        List<PlotItem> items = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Spec spec = kind == Kind.DANCE ? palette.get(i < count - 1 ? 0 : 1) : palette.get((seed + i) % palette.size());
            double x = count == 1 ? 0.5 : 0.12 + 0.76 * i / (count - 1);
            double y = 0.25 + 0.2 * ((seed + i) % 3);
            // 画面で置いたときと同じく、ラベルにはパレットの名前を入れる（ダンサーは番号付き）
            String label = spec.id().equals("dancer") ? "ダンサー" + (i + 1) : spec.label();
            items.add(new PlotItem(String.valueOf(i + 1), spec.id(), label, round(x), round(y)));
        }
        try {
            return MAPPER.writeValueAsString(new StagePlotValue(items));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("配置図のダミーデータを作れませんでした", ex);
        }
    }

    /** 下絵：ステージの床・奥の壁・客席側の印を描いた PNG（縦横比 1.6）。文字は英字だけにして環境に左右されないようにする。 */
    public static byte[] baseImage(String title) {
        int width = 1600;
        int height = 1000;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0xf8fafc));
        g.fillRect(0, 0, width, height);
        g.setColor(new Color(0xe2e8f0));
        g.fillRect(80, 60, width - 160, height - 220);
        g.setColor(new Color(0x334155));
        g.setStroke(new BasicStroke(8));
        g.drawRect(80, 60, width - 160, height - 220);
        g.setStroke(new BasicStroke(3, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 10, new float[] { 18, 12 }, 0));
        g.drawLine(80, height / 2 - 60, width - 80, height / 2 - 60);
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 44));
        g.drawString(title, 110, 120);
        g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 40));
        g.drawString("AUDIENCE", width / 2 - 100, height - 60);
        g.dispose();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static List<IconNode> nodes(String icon) {
        if (icon.equals("user")) {
            return USER;
        }
        List<IconNode> nodes = ICONS.get(icon);
        if (nodes == null) {
            throw new IllegalStateException("ダミーデータのアイコンがありません: " + icon);
        }
        return nodes;
    }

    private static Map<String, List<IconNode>> loadIcons() {
        try (InputStream in = DemoStagePlots.class.getResourceAsStream("/dev-seed/instrument-icons.json")) {
            if (in == null) {
                throw new IllegalStateException("dev-seed/instrument-icons.json がありません");
            }
            JsonNode root = MAPPER.readTree(in);
            Map<String, List<IconNode>> icons = new java.util.HashMap<>();
            for (JsonNode icon : root.get("icons")) {
                icons.put(icon.get("name").asText(),
                        List.of(MAPPER.treeToValue(icon.get("nodes"), IconNode[].class)));
            }
            return icons;
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static double round(double value) {
        return Math.round(value * 1000) / 1000.0;
    }
}

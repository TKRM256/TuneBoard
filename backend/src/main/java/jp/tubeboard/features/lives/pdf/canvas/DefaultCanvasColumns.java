package jp.tubeboard.features.lives.pdf.canvas;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;

/**
 * 既定フォーム向けの表の列構成。
 * frontend の default-canvas-columns.ts と同じ結果になるよう対応させて保つこと。
 *
 * 出演者は「氏名（代表者なら注記付き）／担当パート」、セットリストは
 * 「曲名 or MC／使うパート／使うマイク／各備考」で読めるようにする。
 * 既定フォームのブロックIDを手掛かりに組み立て、見つからない項目は列から落とす。
 */
final class DefaultCanvasColumns {

    private static final String MEMBERS = "members";
    private static final String MEMBER_NAME = "member-name";
    private static final String MEMBER_REPRESENTATIVE = "member-representative";
    private static final String MEMBER_PARTS = "member-parts";
    private static final String SETLIST = "setlist";
    private static final String SONG = "song";
    private static final String SONG_PARTS = "song-parts";
    private static final String SONG_MICS = "song-mics";
    private static final String MC_MICS = "mc-mics";
    private static final String MC_VARIANT = "mc-entry";
    private static final List<String> SONG_NOTES = List.of("song-note-pa", "song-note-light", "song-note-other");

    private DefaultCanvasColumns() {
    }

    static TableColumn indexColumn(float widthRatio) {
        return new TableColumn(uuid(), "No", "__index__", widthRatio, "center", null);
    }

    /** 既定フォームの構成に当てはまるときだけ、専用の列構成を返す。 */
    static List<TableColumn> forGroup(FormBlockResponse group) {
        if (MEMBERS.equals(group.id())) {
            return memberColumns(group);
        }
        if (SETLIST.equals(group.id())) {
            return setlistColumns(group);
        }
        return null;
    }

    private static List<TableColumn> memberColumns(FormBlockResponse group) {
        Map<String, FormBlockResponse> fields = unionLeafFields(group);
        FormBlockResponse name = fields.get(MEMBER_NAME);
        FormBlockResponse parts = fields.get(MEMBER_PARTS);
        if (name == null || parts == null) {
            return null;
        }

        FormBlockResponse representative = fields.get(MEMBER_REPRESENTATIVE);
        String nameFormat = representative == null ? null
                : "${item.field('" + name.id() + "').value}"
                        + "${item.field('" + representative.id() + "').value == 'true' ? '(代表者)' : ''}";

        return List.of(
                indexColumn(0.1f),
                new TableColumn(uuid(), name.label(), name.id(), 0.4f, "left", nameFormat),
                new TableColumn(uuid(), parts.label(), parts.id(), 0.5f, "left", null));
    }

    private static List<TableColumn> setlistColumns(FormBlockResponse group) {
        Map<String, FormBlockResponse> fields = unionLeafFields(group);
        FormBlockResponse song = fields.get(SONG);
        if (song == null) {
            return null;
        }

        List<TableColumn> columns = new ArrayList<>();
        columns.add(indexColumn(0.05f));
        columns.add(new TableColumn(uuid(), "曲 / MC", song.id(), 0.2f, "left", songOrMcExpression(group, song)));

        FormBlockResponse parts = fields.get(SONG_PARTS);
        if (parts != null) {
            columns.add(new TableColumn(uuid(), parts.label(), parts.id(), 0.17f, "left", null));
        }

        String micFormat = micExpression(group);
        if (micFormat != null) {
            columns.add(new TableColumn(uuid(), "使うマイク", "", 0.16f, "left", micFormat));
        }

        for (String noteId : SONG_NOTES) {
            FormBlockResponse note = fields.get(noteId);
            if (note != null) {
                columns.add(new TableColumn(uuid(), note.label(), note.id(), 0.14f, "left", null));
            }
        }

        return normalizeWidths(columns);
    }

    /** 曲の項目は曲名を、MCの項目は「MC」と出す。 */
    private static String songOrMcExpression(FormBlockResponse group, FormBlockResponse song) {
        String songTitle = "item.field('" + song.id() + "').values[0]";
        String mcVariantId = findVariantId(group, MC_VARIANT);
        return mcVariantId == null
                ? "${" + songTitle + "}"
                : "${item.variant == '" + mcVariantId + "' ? 'MC' : " + songTitle + "}";
    }

    /**
     * 曲とMCで別のマイク欄を使うので、項目の種類で切り替えて 1 列にまとめる。
     * メインボーカルの担当者には (メイン) を付け、担当者ごとに改行する。
     */
    private static String micExpression(FormBlockResponse group) {
        Map<String, FormBlockResponse> childGroups = unionChildGroups(group);
        String songMics = joinMicMembers(childGroups.get(SONG_MICS));
        String mcMics = joinMicMembers(childGroups.get(MC_MICS));
        String mcVariantId = findVariantId(group, MC_VARIANT);

        if (songMics != null && mcMics != null && mcVariantId != null) {
            return "${item.variant == '" + mcVariantId + "' ? " + mcMics + " : " + songMics + "}";
        }
        String only = songMics != null ? songMics : mcMics;
        return only == null ? null : "${" + only + "}";
    }

    private static String joinMicMembers(FormBlockResponse micGroup) {
        if (micGroup == null) {
            return null;
        }
        FormBlockResponse member = null;
        FormBlockResponse mainVocal = null;
        for (FormBlockResponse field : unionLeafFields(micGroup).values()) {
            if ("BOOLEAN".equals(field.type())) {
                if (mainVocal == null) mainVocal = field;
            } else if (member == null) {
                member = field;
            }
        }
        if (member == null) {
            return null;
        }

        String mark = mainVocal == null ? ""
                : " + (m.field('" + mainVocal.id() + "').value == 'true' ? '(メイン)' : '')";
        return "mapJoin(item.group('" + micGroup.id() + "').items, (m) -> m.field('"
                + member.id() + "').value" + mark + ", '\\n')";
    }

    /** 繰り返しグループの葉フィールドを、バリアントをまたいで宣言順に集める。 */
    private static Map<String, FormBlockResponse> unionLeafFields(FormBlockResponse group) {
        Map<String, FormBlockResponse> out = new LinkedHashMap<>();
        for (FormBlockResponse block : flattenVariants(group)) {
            if (!"REPEATABLE_GROUP".equals(block.type())) {
                out.putIfAbsent(block.id(), block);
            }
        }
        return out;
    }

    private static Map<String, FormBlockResponse> unionChildGroups(FormBlockResponse group) {
        Map<String, FormBlockResponse> out = new LinkedHashMap<>();
        for (FormBlockResponse block : flattenVariants(group)) {
            if ("REPEATABLE_GROUP".equals(block.type())) {
                out.putIfAbsent(block.id(), block);
            }
        }
        return out;
    }

    private static List<FormBlockResponse> flattenVariants(FormBlockResponse group) {
        List<FormBlockResponse> sources = new ArrayList<>();
        if (group.fields() != null) {
            sources.addAll(group.fields());
        }
        if (group.variants() != null) {
            for (VariantResponse variant : group.variants()) {
                if (variant.fields() != null) {
                    sources.addAll(variant.fields());
                }
            }
        }
        List<FormBlockResponse> out = new ArrayList<>();
        flattenSections(sources, out);
        return out;
    }

    private static void flattenSections(List<FormBlockResponse> blocks, List<FormBlockResponse> out) {
        for (FormBlockResponse block : blocks) {
            if (block == null) continue;
            if ("SECTION".equals(block.type())) {
                flattenSections(block.fields() == null ? List.of() : block.fields(), out);
            } else {
                out.add(block);
            }
        }
    }

    private static String findVariantId(FormBlockResponse group, String variantId) {
        if (group.variants() == null) {
            return null;
        }
        for (VariantResponse variant : group.variants()) {
            if (variantId.equals(variant.id())) {
                return variant.id();
            }
        }
        return null;
    }

    /** 列を落とした分だけ幅が余るので、合計が 1 になるようにならす。 */
    private static List<TableColumn> normalizeWidths(List<TableColumn> columns) {
        float total = 0f;
        for (TableColumn column : columns) {
            total += column.widthRatio();
        }
        if (total <= 0f) {
            return columns;
        }
        List<TableColumn> out = new ArrayList<>(columns.size());
        for (TableColumn column : columns) {
            out.add(new TableColumn(column.id(), column.header(), column.fieldId(),
                    column.widthRatio() / total, column.align(), column.format()));
        }
        return out;
    }

    private static String uuid() {
        return UUID.randomUUID().toString();
    }
}

package jp.tubeboard.features.lives.service.config;

import java.util.ArrayList;
import java.util.List;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.service.SettingSheetConstants;

/**
 * 管理者だけが入力する項目の扱い。出演者には項目そのものを見せないので、公開向けの設定からは取り除く。
 * 管理者入力はグループの外（トップレベルとセクションの中）にしか置けない。
 */
public final class AdminOnlyBlocks {

    private AdminOnlyBlocks() {
    }

    /** 出演者向けの設定。管理者入力の項目を除く。 */
    public static SettingSheetConfigResponse stripForPublic(SettingSheetConfigResponse config) {
        return new SettingSheetConfigResponse(config.title(), config.description(), config.submitButtonLabel(),
                config.publicSubmissionEnabled(), strip(config.blocks()));
    }

    /** 管理者入力のブロックの一覧（セクションの中も含む）。 */
    public static List<FormBlockResponse> collect(SettingSheetConfigResponse config) {
        List<FormBlockResponse> out = new ArrayList<>();
        collect(config.blocks(), out);
        return out;
    }

    private static void collect(List<FormBlockResponse> blocks, List<FormBlockResponse> out) {
        if (blocks == null) {
            return;
        }
        for (FormBlockResponse block : blocks) {
            if (SettingSheetConstants.BLOCK_SECTION.equals(block.type())) {
                collect(block.fields(), out);
            } else if (block.isAdminOnly()) {
                out.add(block);
            }
        }
    }

    private static List<FormBlockResponse> strip(List<FormBlockResponse> blocks) {
        if (blocks == null) {
            return List.of();
        }
        List<FormBlockResponse> out = new ArrayList<>();
        for (FormBlockResponse block : blocks) {
            if (block.isAdminOnly()) {
                continue;
            }
            out.add(SettingSheetConstants.BLOCK_SECTION.equals(block.type()) ? withFields(block, strip(block.fields()))
                    : block);
        }
        return List.copyOf(out);
    }

    private static FormBlockResponse withFields(FormBlockResponse b, List<FormBlockResponse> fields) {
        return new FormBlockResponse(b.id(), b.type(), b.label(), b.description(), b.hidden(), b.publicVisible(),
                b.adminVisible(), b.required(), b.collapsible(), b.appearance(), b.itemAppearance(), b.options(),
                b.minItems(), b.addButtonLabel(), b.entryTitle(), b.titleSourceFieldId(), fields, b.layout(),
                b.optionSource(), b.duplicateDetectionRole(), b.variants(), b.adminOnly());
    }
}

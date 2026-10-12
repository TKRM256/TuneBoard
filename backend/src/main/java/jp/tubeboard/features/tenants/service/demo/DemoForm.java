package jp.tubeboard.features.tenants.service.demo;

import java.util.Arrays;
import java.util.List;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.GroupItemRequest;

/**
 * 開発用のダミーデータで使う、既定（バンド向け）とは形の違う提出フォーム。
 * フォームの設定（settings_json）と、そのフォームに合わせた提出の中身を作る。
 */
public interface DemoForm {

    /** ライブに保存するフォームの設定（JSON）。読み込むときに足りない設定は既定で補われる。 */
    String settingsJson();

    /** 提出の一覧に出す名前。index は同じライブの中での番号（0 始まり） */
    String recordLabel(int liveIndex, int index);

    /** 提出の中身。 */
    PublicSettingSheetSubmissionRequest payload(int liveIndex, int index);

    /** 空の値は「回答なし」として除く。 */
    static FieldAnswerRequest answer(String fieldId, String... values) {
        return new FieldAnswerRequest(fieldId, Arrays.stream(values).filter(value -> !value.isBlank()).toList(),
                List.of());
    }

    static FieldAnswerRequest group(String fieldId, List<GroupItemRequest> items) {
        return new FieldAnswerRequest(fieldId, List.of(), items);
    }

    static GroupItemRequest item(String variantId, FieldAnswerRequest... answers) {
        return new GroupItemRequest(variantId, List.of(answers));
    }

    static <T> T pick(List<T> values, int index) {
        return values.get(Math.floorMod(index, values.size()));
    }
}

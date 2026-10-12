package jp.tubeboard.features.lives.venueform.render;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;

/** フォームの項目名とグループ名。警告の文や、項目名を付けて書く要素に使う。 */
record FormLabels(Map<String, String> fields, Map<String, String> groups) {

    static FormLabels of(List<FormBlockResponse> blocks) {
        FormLabels labels = new FormLabels(new HashMap<>(), new HashMap<>());
        labels.collect(blocks);
        return labels;
    }

    private void collect(List<FormBlockResponse> blocks) {
        if (blocks == null) {
            return;
        }
        for (FormBlockResponse block : blocks) {
            if (block == null) {
                continue;
            }
            if ("REPEATABLE_GROUP".equals(block.type())) {
                groups.put(block.id(), block.label());
            }
            if (block.label() != null) {
                fields.putIfAbsent(block.id(), block.label());
            }
            collect(block.fields());
            if (block.variants() != null) {
                block.variants().forEach(variant -> collect(variant.fields()));
            }
        }
    }

    String field(String id) {
        return fields.get(id);
    }

    String group(String id) {
        return groups.getOrDefault(id, id);
    }
}

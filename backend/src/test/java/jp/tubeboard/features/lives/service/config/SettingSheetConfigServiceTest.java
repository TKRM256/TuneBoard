package jp.tubeboard.features.lives.service.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;

/**
 * 表示設定の後方互換を確認するテスト。
 * adminVisible は既存の本番データ(settings_json)には存在しないため、
 * 読み込み時に publicVisible を引き継ぐ必要がある。
 */
class SettingSheetConfigServiceTest {

    private final FormBuilderHelper formBuilderHelper = new FormBuilderHelper();
    private final SettingSheetConfigService service = new SettingSheetConfigService(
            new SettingSheetConfigServiceHelper(formBuilderHelper), formBuilderHelper);

    private Live liveWithSettings(String settingsJson) {
        Live live = new Live();
        live.setSettingsJson(settingsJson);
        return live;
    }

    private FormBlockResponse firstBlock(SettingSheetConfigResponse config) {
        return config.blocks().get(0);
    }

    @Test
    void adminVisibleFallsBackToPublicVisibleForLegacyJson() {
        String legacyJson = """
                {
                  "title": "旧フォーム",
                  "blocks": [
                    { "id": "band-name", "type": "SHORT_TEXT", "label": "バンド名", "publicVisible": true },
                    { "id": "detail", "type": "LONG_TEXT", "label": "備考", "publicVisible": false }
                  ]
                }
                """;

        SettingSheetConfigResponse config = service.readSettingSheetConfig(liveWithSettings(legacyJson));

        assertThat(config.blocks()).hasSize(2);
        assertThat(config.blocks().get(0).publicVisible()).isTrue();
        assertThat(config.blocks().get(0).adminVisible()).isTrue();
        assertThat(config.blocks().get(1).publicVisible()).isFalse();
        assertThat(config.blocks().get(1).adminVisible()).isFalse();
    }

    @Test
    void adminVisibleIsKeptIndependentWhenPresent() {
        String json = """
                {
                  "title": "新フォーム",
                  "blocks": [
                    {
                      "id": "detail", "type": "LONG_TEXT", "label": "備考",
                      "publicVisible": false, "adminVisible": true
                    }
                  ]
                }
                """;

        SettingSheetConfigResponse config = service.readSettingSheetConfig(liveWithSettings(json));

        assertThat(firstBlock(config).publicVisible()).isFalse();
        assertThat(firstBlock(config).adminVisible()).isTrue();
    }

    @Test
    void nestedBlocksAlsoFallBack() {
        String legacyJson = """
                {
                  "blocks": [
                    {
                      "id": "section-band", "type": "SECTION", "label": "バンド基本情報",
                      "fields": [
                        { "id": "band-name", "type": "SHORT_TEXT", "label": "バンド名", "publicVisible": true }
                      ]
                    }
                  ]
                }
                """;

        SettingSheetConfigResponse config = service.readSettingSheetConfig(liveWithSettings(legacyJson));

        FormBlockResponse nested = firstBlock(config).fields().get(0);
        assertThat(nested.publicVisible()).isTrue();
        assertThat(nested.adminVisible()).isTrue();
    }

    @Test
    void savedConfigRoundTripsAdminVisible() {
        String json = """
                {
                  "blocks": [
                    {
                      "id": "detail", "type": "LONG_TEXT", "label": "備考",
                      "publicVisible": true, "adminVisible": false
                    }
                  ]
                }
                """;

        SettingSheetConfigResponse parsed = service.readSettingSheetConfig(liveWithSettings(json));
        SettingSheetConfigResponse reloaded = service
                .readSettingSheetConfig(liveWithSettings(service.writeSettingSheetConfig(parsed)));

        assertThat(firstBlock(reloaded).publicVisible()).isTrue();
        assertThat(firstBlock(reloaded).adminVisible()).isFalse();
    }
}

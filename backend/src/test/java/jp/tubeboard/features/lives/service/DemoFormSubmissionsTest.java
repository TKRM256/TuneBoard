package jp.tubeboard.features.lives.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.service.config.FormBuilderHelper;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigServiceHelper;
import jp.tubeboard.features.lives.stageplot.StagePlotSettings;
import jp.tubeboard.features.tenants.service.demo.DanceDemoForm;
import jp.tubeboard.features.tenants.service.demo.DemoForm;
import jp.tubeboard.features.tenants.service.demo.FesDemoForm;

/** 開発用のダミーデータの、形の違うフォームと提出。読み込めて、提出が本物の提出と同じ検査を通ること。 */
class DemoFormSubmissionsTest {

    private final FormBuilderHelper formBuilderHelper = new FormBuilderHelper();
    private final SettingSheetConfigService configService = new SettingSheetConfigService(
            new SettingSheetConfigServiceHelper(formBuilderHelper), formBuilderHelper);

    static List<DemoForm> forms() {
        return List.of(new DanceDemoForm(), new FesDemoForm());
    }

    @ParameterizedTest
    @MethodSource("forms")
    void フォームを読み込むと入れ子の繰り返しや演目ごとの項目も残っている(DemoForm form) {
        SettingSheetConfigResponse config = read(form);

        assertThat(config.description()).isEmpty();
        List<String> ids = allIds(config.blocks());
        if (form instanceof FesDemoForm) {
            assertThat(ids).contains("performers", "gear", "gear-power", "program", "program-song-title",
                    "program-talk-topic", "program-change-note", "running-order");
        } else {
            assertThat(ids).contains("team", "genre", "lights", "dancers", "tracks", "track-time");
        }
    }

    @ParameterizedTest
    @MethodSource("forms")
    void 提出は本物の提出と同じ検査を通る(DemoForm form) {
        SettingSheetConfigResponse config = read(form);
        for (int liveIndex = 0; liveIndex < 3; liveIndex++) {
            for (int index = 0; index < 12; index++) {
                PublicSettingSheetSubmissionRequest payload = form.payload(liveIndex, index);
                Map<String, String> errors = new HashMap<>();
                SubmissionAnswerValidator.validate(config.blocks(), payload.answers(), "answers.",
                        new SubmissionAnswerValidator.Context(config.blocks(), payload.answers(), errors, true,
                                StagePlotSettings.empty()),
                        true);
                assertThat(errors).as("%s live=%d index=%d", form.getClass().getSimpleName(), liveIndex, index)
                        .isEmpty();
            }
        }
    }

    private SettingSheetConfigResponse read(DemoForm form) {
        Live live = new Live();
        live.setSettingsJson(form.settingsJson());
        return configService.readSettingSheetConfig(live);
    }

    private static List<String> allIds(List<FormBlockResponse> blocks) {
        List<String> ids = new ArrayList<>();
        for (FormBlockResponse block : blocks == null ? List.<FormBlockResponse>of() : blocks) {
            ids.add(block.id());
            ids.addAll(allIds(block.fields()));
            if (block.variants() != null) {
                block.variants().forEach(variant -> ids.addAll(allIds(variant.fields())));
            }
        }
        return ids;
    }
}

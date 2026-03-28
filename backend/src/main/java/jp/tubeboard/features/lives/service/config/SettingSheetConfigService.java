package jp.tubeboard.features.lives.service.config;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.dto.request.SettingSheetConfigUpdateRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SettingSheetConfigService {

        private ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();
        private final SettingSheetConfigServiceHelper helper;
        private final FormBuilderHelper formBuilderHelper;

        public SettingSheetConfigResponse defaultSettingSheetConfig() {
                List<FormBlockResponse> memberFields = List.of(
                                formBuilderHelper.textBlock("member-name", "氏名", true,
                                                formBuilderHelper.layoutTwoThirds(1)),
                                formBuilderHelper.booleanBlock("member-representative", "代表者", "代表者にチェックを入れてください。",
                                                formBuilderHelper.layoutThird(1)),
                                formBuilderHelper.selectBlock("member-parts", SettingSheetConstants.BLOCK_MULTI_SELECT,
                                                "担当パート", true,
                                                List.of("Vo", "Gt", "Ba", "Dr", "Key", "Cho", "DJ"), null,
                                                formBuilderHelper.layoutFull(3)));

                List<FormBlockResponse> songMicFields = List.of(
                                formBuilderHelper.selectBlock("mic-member", SettingSheetConstants.BLOCK_SINGLE_SELECT,
                                                "担当者", true,
                                                List.of(),
                                                formBuilderHelper.optionSource("members", "member-name"),
                                                formBuilderHelper.layoutTwoThirds(1)),
                                formBuilderHelper.booleanBlock("mic-main-vocal", "メインボーカル", "",
                                                formBuilderHelper.layoutThird(1)));

                List<FormBlockResponse> songFields = List.of(
                                formBuilderHelper.textBlock("song-title", "曲名", true, formBuilderHelper.layoutHalf(1),
                                                SettingSheetConstants.DUPLICATE_ROLE_SONG_TITLE),
                                formBuilderHelper.textBlock("song-artist", "アーティスト名", true,
                                                formBuilderHelper.layoutHalf(1),
                                                SettingSheetConstants.DUPLICATE_ROLE_SONG_ARTIST),
                                formBuilderHelper.selectBlock("song-parts", SettingSheetConstants.BLOCK_MULTI_SELECT,
                                                "使うパート", true,
                                                List.of("Vo", "Gt", "Ba", "Dr", "Key", "Cho", "SE", "同期"), null,
                                                formBuilderHelper.layoutFull(3)),
                                formBuilderHelper.longTextBlock("song-note-pa", "PAへの要望", false,
                                                formBuilderHelper.layoutHalf(1)),
                                formBuilderHelper.longTextBlock("song-note-light", "照明への要望", false,
                                                formBuilderHelper.layoutHalf(1)),
                                formBuilderHelper.longTextBlock("song-note-other", "備考", false,
                                                formBuilderHelper.layoutFull(1)),
                                formBuilderHelper.groupBlock("song-mics", "使うマイク", "誰がどのマイクを使うか入力します。", false, true, 0,
                                                "マイク追加", "マイク",
                                                "mic-member", formBuilderHelper.layoutFull(1), songMicFields));

                List<FormBlockResponse> bandFields = List.of(
                                formBuilderHelper.textBlock("band-name", "バンド名", true,
                                                formBuilderHelper.layoutTwoThirds(1)),
                                formBuilderHelper.selectBlock("submission-status",
                                                SettingSheetConstants.BLOCK_SINGLE_SELECT, "提出状況",
                                                true,
                                                List.of("未完成", "完成"), null, formBuilderHelper.layoutThird(1)),
                                formBuilderHelper.longTextBlock("detail", "備考", false,
                                                formBuilderHelper.layoutFull(1)));

                return new SettingSheetConfigResponse(
                                "バンド申請フォーム",
                                "出演情報、メンバー、演奏曲を入力してください。",
                                "送信する",
                                true,
                                List.of(
                                                formBuilderHelper.sectionBlock("section-band", "バンド基本情報",
                                                                "バンド名、提出状況、備考を入力します。", bandFields),
                                                formBuilderHelper.groupBlock("members", "出演者", "出演者と担当パートを入力します。", true,
                                                                true, 1, "メンバー追加",
                                                                "メンバー",
                                                                "member-name", formBuilderHelper.layoutFull(1),
                                                                memberFields),
                                                formBuilderHelper.groupBlock("songs", "演奏する曲", "曲名、使用パート、マイク設定を入力します。",
                                                                true, true, 1, "曲を追加",
                                                                "曲",
                                                                "song-title", formBuilderHelper.layoutFull(1),
                                                                songFields)));
        }

        public SettingSheetConfigResponse readSettingSheetConfig(Live live) {
                if (live.getSettingsJson() == null || live.getSettingsJson().isBlank()) {
                        return defaultSettingSheetConfig();
                }
                try {
                        SettingSheetConfigResponse parsed = objectMapper.readValue(live.getSettingsJson(),
                                        SettingSheetConfigResponse.class);
                        SettingSheetConfigResponse defaults = defaultSettingSheetConfig();
                        return new SettingSheetConfigResponse(
                                        formBuilderHelper.safeTextOrDefault(parsed.title(), defaults.title()),
                                        formBuilderHelper.safeTextOrDefault(parsed.description(),
                                                        defaults.description()),
                                        formBuilderHelper.safeTextOrDefault(parsed.submitButtonLabel(),
                                                        defaults.submitButtonLabel()),
                                        parsed.publicSubmissionEnabled() == null
                                                        ? defaults.publicSubmissionEnabled()
                                                        : parsed.publicSubmissionEnabled(),
                                        helper.normalizeBlocks(helper.mapToFormBlockRequests(parsed.blocks()),
                                                        defaults));
                } catch (JsonProcessingException ex) {
                        return defaultSettingSheetConfig();
                }
        }

        public String writeSettingSheetConfig(SettingSheetConfigResponse config) {
                try {
                        return objectMapper.writeValueAsString(config);
                } catch (JsonProcessingException ex) {
                        throw new IllegalStateException("セッティングシート設定の保存に失敗しました", ex);
                }
        }

        public SettingSheetConfigResponse normalizeSettingSheetConfig(SettingSheetConfigUpdateRequest request) {
                SettingSheetConfigResponse defaults = defaultSettingSheetConfig();
                Boolean publicSubmissionEnabled = request.publicSubmissionEnabled() != null
                                ? request.publicSubmissionEnabled()
                                : defaults.publicSubmissionEnabled();
                return new SettingSheetConfigResponse(
                                formBuilderHelper.safeTextOrDefault(request.title(), "バンド申請フォーム"),
                                formBuilderHelper.safeTextOrDefault(request.description(), "出演情報、メンバー、演奏曲を入力してください。"),
                                formBuilderHelper.safeTextOrDefault(request.submitButtonLabel(), "送信する"),
                                publicSubmissionEnabled,
                                helper.normalizeBlocks(request.blocks(), defaults));
        }
}
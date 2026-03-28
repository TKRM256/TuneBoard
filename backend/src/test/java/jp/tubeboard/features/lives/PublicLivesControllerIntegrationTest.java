package jp.tubeboard.features.lives;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.time.LocalDateTime;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.config.IntegrationTest;
import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserRepository;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.LayoutResponse;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;

@IntegrationTest
@AutoConfigureMockMvc
class PublicLivesControllerIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private TenantsRepository tenantsRepository;

        @Autowired
        private LiveRepository liveRepository;

        @Autowired
        private SettingSheetSubmissionRepository settingSheetSubmissionRepository;

        @BeforeEach
        void setUp() {
                settingSheetSubmissionRepository.deleteAll();
                liveRepository.deleteAll();
                tenantsRepository.deleteAll();
                userRepository.deleteAll();
        }

        @Test
        void submitした内容を公開APIで再取得できる() throws Exception {
                Live live = createPublicLive();

                MvcResult submitResult = mockMvc.perform(
                                post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                                .contentType(APPLICATION_JSON)
                                                .content(objectMapper.writeValueAsString(
                                                                createSubmissionRequest("Original Band"))))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.recordLabel").value("Original Band"))
                                .andReturn();

                JsonNode submitJson = objectMapper.readTree(submitResult.getResponse().getContentAsString());
                UUID submissionId = UUID.fromString(submitJson.path("id").asText());

                mockMvc.perform(get("/api/public/lives/{publicToken}/setting-sheet/submissions/{submissionId}",
                                live.getPublicToken(), submissionId))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(submissionId.toString()))
                                .andExpect(jsonPath("$.answers[0].fieldId").value("band-name"))
                                .andExpect(jsonPath("$.answers[0].values[0]").value("Original Band"));
        }

        @Test
        void 提出済みシートを公開APIで更新できる() throws Exception {
                Live live = createPublicLive();

                MvcResult submitResult = mockMvc.perform(
                                post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                                .contentType(APPLICATION_JSON)
                                                .content(objectMapper.writeValueAsString(
                                                                createSubmissionRequest("Original Band"))))
                                .andExpect(status().isOk())
                                .andReturn();

                UUID submissionId = UUID.fromString(objectMapper
                                .readTree(submitResult.getResponse().getContentAsString()).path("id").asText());

                mockMvc.perform(put("/api/public/lives/{publicToken}/setting-sheet/submissions/{submissionId}",
                                live.getPublicToken(), submissionId)
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(createSubmissionRequest("Updated Band"))))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.id").value(submissionId.toString()))
                                .andExpect(jsonPath("$.recordLabel").value("Updated Band"));

                SettingSheetSubmission savedSubmission = settingSheetSubmissionRepository.findById(submissionId)
                                .orElseThrow();
                assertThat(savedSubmission.getRecordLabel()).isEqualTo("Updated Band");
                assertThat(savedSubmission.getPayloadJson()).contains("Updated Band");
        }

        @Test
        void hiddenな必須項目は未入力でも公開APIのバリデーションを通過する() throws Exception {
                Live live = createPublicLive(createHiddenSectionConfig());

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(createSubmissionRequest(""))))
                                .andExpect(status().isOk());
        }

        @Test
        void section配下の表示中必須項目は未入力ならバリデーションエラーになる() throws Exception {
                Live live = createPublicLive(createVisibleSectionConfig());

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                                new PublicSettingSheetSubmissionRequest(List.of()))))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.fieldErrors['answers.band-name']").value("バンド名 は必須です。"));
        }

        @Test
        void sectionと同階層の繰り返しグループ回答は無効な質問扱いにならない() throws Exception {
                Live live = createPublicLive(createSectionAndRepeatableGroupConfig());

                PublicSettingSheetSubmissionRequest request = new PublicSettingSheetSubmissionRequest(List.of(
                                new FieldAnswerRequest("band-name", List.of("Recursive Band"), List.of()),
                                new FieldAnswerRequest(
                                                "members",
                                                List.of(),
                                                List.of(new PublicSettingSheetSubmissionRequest.GroupItemRequest(
                                                                List.of(
                                                                                new FieldAnswerRequest("member-name",
                                                                                                List.of("Alice"),
                                                                                                List.of()))))),
                                new FieldAnswerRequest(
                                                "songs",
                                                List.of(),
                                                List.of(new PublicSettingSheetSubmissionRequest.GroupItemRequest(
                                                                List.of(
                                                                                new FieldAnswerRequest("song-title",
                                                                                                List.of("Song A"),
                                                                                                List.of())))))));

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.recordLabel").value("Recursive Band"));
        }

        @Test
        void 主表示項目に指定したフィールドを提出一覧名として使う() throws Exception {
                Live live = createPublicLive(createCustomMainDisplayConfig());

                PublicSettingSheetSubmissionRequest request = new PublicSettingSheetSubmissionRequest(List.of(
                                new FieldAnswerRequest("entry-name", List.of("Display Name"), List.of()),
                                new FieldAnswerRequest("note", List.of("memo"), List.of())));

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.recordLabel").value("Display Name"));
        }

        @Test
        void 共有提出一覧はpublicVisibleがtrueの項目だけを返す() throws Exception {
                Live live = createPublicLive(createSharedBandOnlyConfig());

                PublicSettingSheetSubmissionRequest request = new PublicSettingSheetSubmissionRequest(List.of(
                                new FieldAnswerRequest("band-name", List.of("Visible Band"), List.of()),
                                new FieldAnswerRequest("submission-status", List.of("完成"), List.of()),
                                new FieldAnswerRequest("detail", List.of("hidden memo"), List.of())));

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/api/public/lives/{publicToken}/setting-sheet/submissions/shared",
                                live.getPublicToken()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].recordLabel").value("Visible Band"))
                                .andExpect(jsonPath("$[0].answers.length()").value(1))
                                .andExpect(jsonPath("$[0].answers[0].fieldId").value("band-name"))
                                .andExpect(jsonPath("$[0].answers[0].values[0]").value("Visible Band"));
        }

        @Test
        void 共有提出一覧のrecordLabelは非公開項目を漏らさない() throws Exception {
                Live live = createPublicLive(createSharedHiddenRecordLabelConfig());

                PublicSettingSheetSubmissionRequest request = new PublicSettingSheetSubmissionRequest(List.of(
                                new FieldAnswerRequest("submission-status", List.of("完成"), List.of()),
                                new FieldAnswerRequest("detail", List.of("公開メモ"), List.of())));

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andExpect(status().isOk());

                mockMvc.perform(get("/api/public/lives/{publicToken}/setting-sheet/submissions/shared",
                                live.getPublicToken()))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$[0].recordLabel").value("公開メモ"))
                                .andExpect(jsonPath("$[0].answers.length()").value(1))
                                .andExpect(jsonPath("$[0].answers[0].fieldId").value("detail"));
        }

        @Test
        void 下書きライブには公開送信できない() throws Exception {
                Live live = createPublicLive(createSimpleConfig(), LiveStatus.DRAFT, null);

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(createSubmissionRequest("Draft Band"))))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("このライブは現在回答を受け付けていません"));
        }

        @Test
        void 締切後のライブには公開送信できない() throws Exception {
                Live live = createPublicLive(createSimpleConfig(), LiveStatus.PUBLISHED,
                                LocalDateTime.now().minusMinutes(5));

                mockMvc.perform(post("/api/public/lives/{publicToken}/setting-sheet/submissions", live.getPublicToken())
                                .contentType(APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(createSubmissionRequest("Late Band"))))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.message").value("回答受付は終了しました"));
        }

        private Live createPublicLive() throws Exception {
                return createPublicLive(createSimpleConfig());
        }

        private Live createPublicLive(SettingSheetConfigResponse config) throws Exception {
                return createPublicLive(config, LiveStatus.PUBLISHED, null);
        }

        private Live createPublicLive(SettingSheetConfigResponse config, LiveStatus status, LocalDateTime deadlineAt)
                        throws Exception {
                User user = userRepository.save(User.builder()
                                .sub("test-sub")
                                .email("test@example.com")
                                .name("Test User")
                                .build());

                Tenants tenant = tenantsRepository.save(Tenants.builder()
                                .name("Test Tenant")
                                .user(user)
                                .build());

                return liveRepository.save(Live.builder()
                                .tenant(tenant)
                                .publicToken(UUID.randomUUID().toString())
                                .name("Test Live")
                                .status(status)
                                .deadlineAt(deadlineAt)
                                .settingsJson(objectMapper.writeValueAsString(config))
                                .build());
        }

        private SettingSheetConfigResponse createSimpleConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                false,
                                List.of(new FormBlockResponse(
                                                "band-name",
                                                "SHORT_TEXT",
                                                "バンド名",
                                                "",
                                                false,
                                                false,
                                                true,
                                                false,
                                                "outline",
                                                "plain",
                                                List.of(),
                                                0,
                                                "",
                                                "",
                                                "",
                                                List.of(),
                                                new LayoutResponse("half", 1, false),
                                                null, "")));
        }

        private SettingSheetConfigResponse createVisibleSectionConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                false,
                                List.of(new FormBlockResponse(
                                                "section-1",
                                                "SECTION",
                                                "セクション",
                                                "",
                                                false,
                                                false,
                                                false,
                                                false,
                                                "plain",
                                                "plain",
                                                List.of(),
                                                0,
                                                "",
                                                "",
                                                "",
                                                List.of(new FormBlockResponse(
                                                                "band-name",
                                                                "SHORT_TEXT",
                                                                "バンド名",
                                                                "",
                                                                false,
                                                                false,
                                                                true,
                                                                false,
                                                                "outline",
                                                                "plain",
                                                                List.of(),
                                                                0,
                                                                "",
                                                                "",
                                                                "",
                                                                List.of(),
                                                                new LayoutResponse("half", 1, false),
                                                                null, "")),
                                                new LayoutResponse("full", 1, false),
                                                null, "")));
        }

        private SettingSheetConfigResponse createHiddenSectionConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                false,
                                List.of(new FormBlockResponse(
                                                "section-1",
                                                "SECTION",
                                                "セクション",
                                                "",
                                                false,
                                                false,
                                                false,
                                                false,
                                                "plain",
                                                "plain",
                                                List.of(),
                                                0,
                                                "",
                                                "",
                                                "",
                                                List.of(new FormBlockResponse(
                                                                "band-name",
                                                                "SHORT_TEXT",
                                                                "バンド名",
                                                                "",
                                                                true,
                                                                false,
                                                                true,
                                                                false,
                                                                "outline",
                                                                "plain",
                                                                List.of(),
                                                                0,
                                                                "",
                                                                "",
                                                                "",
                                                                List.of(),
                                                                new LayoutResponse("half", 1, false),
                                                                null, "")),
                                                new LayoutResponse("full", 1, false),
                                                null, "")));
        }

        private SettingSheetConfigResponse createSectionAndRepeatableGroupConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                false,
                                List.of(
                                                new FormBlockResponse(
                                                                "section-1",
                                                                "SECTION",
                                                                "セクション",
                                                                "",
                                                                false,
                                                                false,
                                                                false,
                                                                false,
                                                                "plain",
                                                                "plain",
                                                                List.of(),
                                                                0,
                                                                "",
                                                                "",
                                                                "",
                                                                List.of(new FormBlockResponse(
                                                                                "band-name",
                                                                                "SHORT_TEXT",
                                                                                "バンド名",
                                                                                "",
                                                                                false,
                                                                                false,
                                                                                true,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of(),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("half", 1, false),
                                                                                null, "")),
                                                                new LayoutResponse("full", 1, false),
                                                                null, ""),
                                                new FormBlockResponse(
                                                                "members",
                                                                "REPEATABLE_GROUP",
                                                                "出演者",
                                                                "",
                                                                false,
                                                                false,
                                                                false,
                                                                false,
                                                                "subtle",
                                                                "outline",
                                                                List.of(),
                                                                0,
                                                                "追加",
                                                                "出演者",
                                                                "member-name",
                                                                List.of(new FormBlockResponse(
                                                                                "member-name",
                                                                                "SHORT_TEXT",
                                                                                "氏名",
                                                                                "",
                                                                                false,
                                                                                false,
                                                                                true,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of(),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("half", 1, false),
                                                                                null, "")),
                                                                new LayoutResponse("full", 1, false),
                                                                null, ""),
                                                new FormBlockResponse(
                                                                "songs",
                                                                "REPEATABLE_GROUP",
                                                                "曲",
                                                                "",
                                                                false,
                                                                false,
                                                                false,
                                                                false,
                                                                "subtle",
                                                                "outline",
                                                                List.of(),
                                                                0,
                                                                "追加",
                                                                "曲",
                                                                "song-title",
                                                                List.of(new FormBlockResponse(
                                                                                "song-title",
                                                                                "SHORT_TEXT",
                                                                                "曲名",
                                                                                "",
                                                                                false,
                                                                                false,
                                                                                true,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of(),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("half", 1, false),
                                                                                null, "")),
                                                                new LayoutResponse("full", 1, false),
                                                                null, "")));
        }

        private SettingSheetConfigResponse createCustomMainDisplayConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                false,
                                List.of(
                                                new FormBlockResponse(
                                                                "entry-name",
                                                                "SHORT_TEXT",
                                                                "表示名",
                                                                "",
                                                                false,
                                                                false,
                                                                true,
                                                                false,
                                                                "outline",
                                                                "plain",
                                                                List.of(),
                                                                0,
                                                                "",
                                                                "",
                                                                "",
                                                                List.of(),
                                                                new LayoutResponse("half", 1, false),
                                                                null, ""),
                                                new FormBlockResponse(
                                                                "note",
                                                                "LONG_TEXT",
                                                                "備考",
                                                                "",
                                                                false,
                                                                false,
                                                                false,
                                                                false,
                                                                "outline",
                                                                "plain",
                                                                List.of(),
                                                                0,
                                                                "",
                                                                "",
                                                                "",
                                                                List.of(),
                                                                new LayoutResponse("full", 1, false),
                                                                null, "")));
        }

        private SettingSheetConfigResponse createSharedBandOnlyConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                true,
                                List.of(new FormBlockResponse(
                                                "section-band",
                                                "SECTION",
                                                "バンド基本情報",
                                                "",
                                                false,
                                                false,
                                                false,
                                                false,
                                                "plain",
                                                "plain",
                                                List.of(),
                                                0,
                                                "",
                                                "",
                                                "",
                                                List.of(
                                                                new FormBlockResponse(
                                                                                "band-name",
                                                                                "SHORT_TEXT",
                                                                                "バンド名",
                                                                                "",
                                                                                false,
                                                                                true,
                                                                                true,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of(),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("half", 1, false),
                                                                                null, ""),
                                                                new FormBlockResponse(
                                                                                "submission-status",
                                                                                "SINGLE_SELECT",
                                                                                "提出状況",
                                                                                "",
                                                                                false,
                                                                                false,
                                                                                true,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of("未完成", "完成"),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("half", 1, false),
                                                                                null, ""),
                                                                new FormBlockResponse(
                                                                                "detail",
                                                                                "LONG_TEXT",
                                                                                "備考",
                                                                                "",
                                                                                false,
                                                                                false,
                                                                                false,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of(),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("full", 1, false),
                                                                                null, "")),
                                                new LayoutResponse("full", 1, false),
                                                null, "")));
        }

        private SettingSheetConfigResponse createSharedHiddenRecordLabelConfig() {
                return new SettingSheetConfigResponse(
                                "公開フォーム",
                                "",
                                "送信する",
                                true,
                                List.of(new FormBlockResponse(
                                                "section-band",
                                                "SECTION",
                                                "バンド基本情報",
                                                "",
                                                false,
                                                false,
                                                false,
                                                false,
                                                "plain",
                                                "plain",
                                                List.of(),
                                                0,
                                                "",
                                                "",
                                                "",
                                                List.of(
                                                                new FormBlockResponse(
                                                                                "submission-status",
                                                                                "SINGLE_SELECT",
                                                                                "提出状況",
                                                                                "",
                                                                                false,
                                                                                false,
                                                                                true,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of("未完成", "完成"),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("half", 1, false),
                                                                                null, ""),
                                                                new FormBlockResponse(
                                                                                "detail",
                                                                                "LONG_TEXT",
                                                                                "備考",
                                                                                "",
                                                                                false,
                                                                                true,
                                                                                false,
                                                                                false,
                                                                                "outline",
                                                                                "plain",
                                                                                List.of(),
                                                                                0,
                                                                                "",
                                                                                "",
                                                                                "",
                                                                                List.of(),
                                                                                new LayoutResponse("full", 1, false),
                                                                                null, "")),
                                                new LayoutResponse("full", 1, false),
                                                null, "")));
        }

        private PublicSettingSheetSubmissionRequest createSubmissionRequest(String bandName) {
                return new PublicSettingSheetSubmissionRequest(List.of(
                                new FieldAnswerRequest("band-name", List.of(bandName), List.of())));
        }
}

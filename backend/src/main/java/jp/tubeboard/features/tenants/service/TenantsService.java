package jp.tubeboard.features.tenants.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.auth.User;
import jp.tubeboard.features.auth.UserService;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest;
import jp.tubeboard.features.lives.dto.request.PublicSettingSheetSubmissionRequest.FieldAnswerRequest;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.LiveStatus;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.lives.service.SettingSheetConstants;
import jp.tubeboard.features.lives.service.config.SettingSheetConfigService;
import jp.tubeboard.features.tenants.dto.request.TenantsCreateRequest;
import jp.tubeboard.features.tenants.dto.request.TenantsUpdateRequest;
import jp.tubeboard.features.tenants.dto.response.TenantResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsCreateResponse;
import jp.tubeboard.features.tenants.dto.response.TenantsUpdateResponse;
import jp.tubeboard.features.tenants.exception.TenantsNotFoundException;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.service.interfaces.ITenantsService;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class TenantsService implements ITenantsService {

        private final TenantsRepository tenantsRepository;
        private final UserService userService;
        private final LiveRepository liveRepository;
        private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
        private final SettingSheetConfigService settingSheetConfigService;
        private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

        @Value("${app.dev.seed-dummy:false}")
        private boolean seedDummy;

        @Override
        public TenantsCreateResponse create(TenantsCreateRequest request) {
                User currentUser = userService.getCurrentUser();

                Tenants savedTenants = tenantsRepository.save(Tenants.builder()
                                .name(request.name())
                                .user(currentUser)
                                .build());

                return TenantsCreateResponse.builder()
                                .id(savedTenants.getId())
                                .name(savedTenants.getName())
                                .build();
        }

        @Override
        public TenantsUpdateResponse update(TenantsUpdateRequest request) {
                User currentUser = userService.getCurrentUser();

                Tenants tenants = tenantsRepository
                                .findByIdAndUserIdAndDeletedAtIsNull(request.id(), currentUser.getId())
                                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

                tenants.setName(request.name());
                Tenants updatedTenants = tenantsRepository.save(tenants);

                return TenantsUpdateResponse.builder()
                                .id(updatedTenants.getId())
                                .name(updatedTenants.getName())
                                .build();
        }

        @Override
        @Transactional
        public List<TenantResponse> list() {
                User currentUser = userService.getCurrentUser();

                List<Tenants> tenantsList = tenantsRepository.findAllByUserIdAndDeletedAtIsNull(currentUser.getId());
                if (seedDummy && tenantsList.isEmpty()) {
                        Tenants tenant = tenantsRepository.save(Tenants.builder()
                                        .name("デモサークル")
                                        .user(currentUser)
                                        .build());
                        createDummyLiveData(tenant);
                        tenantsList = tenantsRepository.findAllByUserIdAndDeletedAtIsNull(currentUser.getId());
                }

                return tenantsList.stream().map(tenants -> TenantResponse.builder()
                                .id(tenants.getId())
                                .name(tenants.getName())
                                .build()).toList();
        }

        @Override
        public TenantResponse get(UUID tenantId) {
                User currentUser = userService.getCurrentUser();
                Tenants optionalTenants = tenantsRepository.findByIdAndUserIdAndDeletedAtIsNull(tenantId,
                                currentUser.getId()).orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));
                return TenantResponse.builder()
                                .id(optionalTenants.getId())
                                .name(optionalTenants.getName())
                                .build();
        }

        @Override
        public void delete(UUID id) {
                User currentUser = userService.getCurrentUser();

                Tenants tenants = tenantsRepository.findByIdAndUserIdAndDeletedAtIsNull(id, currentUser.getId())
                                .orElseThrow(() -> new TenantsNotFoundException("テナントが見つかりません"));

                tenants.setDeletedAt(LocalDateTime.now());
                tenantsRepository.save(tenants);
        }

        private void createDummyLiveData(Tenants tenant) {
                Live live = liveRepository.save(Live.builder()
                                .tenant(tenant)
                                .publicToken(UUID.randomUUID().toString())
                                .name("春ライブ（デモ）")
                                .date(LocalDate.now().plusDays(14))
                                .location("学内ホール")
                                .deadlineAt(LocalDateTime.now().plusDays(7))
                                .status(LiveStatus.PUBLISHED)
                                .settingsJson(settingSheetConfigService.writeSettingSheetConfig(
                                                settingSheetConfigService.defaultSettingSheetConfig()))
                                .build());

                settingSheetSubmissionRepository.save(createSubmission(live, "Dummy Band A", "夏祭り", "スピッツ"));
                settingSheetSubmissionRepository.save(createSubmission(live, "Dummy Band B", "夏祭り", "スピッツ"));
                settingSheetSubmissionRepository
                                .save(createSubmission(live, "Dummy Band C", "リライト", "ASIAN KUNG-FU GENERATION"));
        }

        private SettingSheetSubmission createSubmission(Live live, String bandName, String songTitle, String artist) {
                return SettingSheetSubmission.builder()
                                .live(live)
                                .recordLabel(bandName)
                                .submissionStatus(SettingSheetConstants.SUBMISSION_STATUS)
                                .payloadJson(toPayloadJson(bandName, songTitle, artist))
                                .build();
        }

        private String toPayloadJson(String bandName, String songTitle, String artist) {
                PublicSettingSheetSubmissionRequest payload = new PublicSettingSheetSubmissionRequest(List.of(
                                new FieldAnswerRequest("band-name", List.of(bandName), List.of()),
                                new FieldAnswerRequest("submission-status", List.of("完成"), List.of()),
                                new FieldAnswerRequest("setlist", List.of(), List.of(
                                                new PublicSettingSheetSubmissionRequest.GroupItemRequest("song-entry",
                                                                List.of(
                                                                                new FieldAnswerRequest("song",
                                                                                                List.of(songTitle,
                                                                                                                artist),
                                                                                                List.of()),
                                                                                new FieldAnswerRequest("song-parts",
                                                                                                List.of("Vo", "Gt",
                                                                                                                "Ba",
                                                                                                                "Dr"),
                                                                                                List.of())))))),
                                null);
                try {
                        return objectMapper.writeValueAsString(payload);
                } catch (JsonProcessingException ex) {
                        throw new IllegalStateException("ダミーデータの作成に失敗しました", ex);
                }
        }

}

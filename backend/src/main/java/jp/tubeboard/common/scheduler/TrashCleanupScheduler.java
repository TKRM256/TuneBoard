package jp.tubeboard.common.scheduler;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.model.SettingSheetSubmission;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.repository.SettingSheetSubmissionRepository;
import jp.tubeboard.features.tenants.model.Tenants;
import jp.tubeboard.features.tenants.repository.TenantInvitationRepository;
import jp.tubeboard.features.tenants.repository.TenantsRepository;
import jp.tubeboard.features.tenants.repository.UserTenantRepository;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class TrashCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(TrashCleanupScheduler.class);
    private static final int TRASH_RETENTION_DAYS = 30;

    private final TenantsRepository tenantsRepository;
    private final LiveRepository liveRepository;
    private final SettingSheetSubmissionRepository settingSheetSubmissionRepository;
    private final UserTenantRepository userTenantRepository;
    private final TenantInvitationRepository tenantInvitationRepository;

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void purgeExpiredTrashedRecords() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(TRASH_RETENTION_DAYS);

        List<SettingSheetSubmission> expiredSubmissions = settingSheetSubmissionRepository.findAll().stream()
                .filter(s -> s.getDeletedAt() != null && s.getDeletedAt().isBefore(cutoff))
                .toList();
        if (!expiredSubmissions.isEmpty()) {
            settingSheetSubmissionRepository.deleteAll(expiredSubmissions);
            log.info("Purged {} expired submission(s) from trash", expiredSubmissions.size());
        }

        List<Live> expiredLives = liveRepository.findAll().stream()
                .filter(l -> l.getDeletedAt() != null && l.getDeletedAt().isBefore(cutoff))
                .toList();
        if (!expiredLives.isEmpty()) {
            for (Live live : expiredLives) {
                settingSheetSubmissionRepository.deleteAllByLiveId(live.getId());
            }
            liveRepository.deleteAll(expiredLives);
            log.info("Purged {} expired live(s) from trash", expiredLives.size());
        }

        List<Tenants> expiredTenants = tenantsRepository.findAll().stream()
                .filter(t -> t.getDeletedAt() != null && t.getDeletedAt().isBefore(cutoff))
                .toList();
        if (!expiredTenants.isEmpty()) {
            for (Tenants tenant : expiredTenants) {
                purgeTenantRelations(tenant.getId());
            }
            tenantsRepository.deleteAll(expiredTenants);
            log.info("Purged {} expired tenant(s) from trash", expiredTenants.size());
        }
    }

    private void purgeTenantRelations(java.util.UUID tenantId) {
        List<Live> lives = liveRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId);
        for (Live live : lives) {
            settingSheetSubmissionRepository.deleteAllByLiveId(live.getId());
        }
        liveRepository.deleteAllByTenantId(tenantId);
        tenantInvitationRepository.deleteAllByTenantId(tenantId);
        userTenantRepository.deleteAllByTenantId(tenantId);
    }
}

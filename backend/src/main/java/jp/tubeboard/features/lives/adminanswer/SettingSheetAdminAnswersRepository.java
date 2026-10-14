package jp.tubeboard.features.lives.adminanswer;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

@Repository
public interface SettingSheetAdminAnswersRepository extends JpaRepository<SettingSheetAdminAnswers, UUID> {

    Optional<SettingSheetAdminAnswers> findBySubmissionId(UUID submissionId);

    /** 管理者 2 人が別々の項目を同時に保存しても片方の入力が消えないよう、読み込み時に行をロックする。 */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM SettingSheetAdminAnswers a WHERE a.submissionId = :submissionId")
    Optional<SettingSheetAdminAnswers> findForUpdateBySubmissionId(@Param("submissionId") UUID submissionId);

    List<SettingSheetAdminAnswers> findAllBySubmissionIdIn(Collection<UUID> submissionIds);
}

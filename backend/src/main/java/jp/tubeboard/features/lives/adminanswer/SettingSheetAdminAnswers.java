package jp.tubeboard.features.lives.adminanswer;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jp.tubeboard.common.model.Audit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 管理者だけが入力する項目の回答（提出 1 件につき 1 行）。
 * 提出とは別の行にして、管理者が書き換えても出演者側の版（楽観ロック）が進まないようにする。
 */
@Table(name = "setting_sheet_admin_answers")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettingSheetAdminAnswers extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "submission_id", nullable = false, unique = true)
    private UUID submissionId;

    @Column(name = "answers_json", nullable = false, columnDefinition = "TEXT")
    private String answersJson;
}

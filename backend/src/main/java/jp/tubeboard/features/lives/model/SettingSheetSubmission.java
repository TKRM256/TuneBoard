package jp.tubeboard.features.lives.model;

import java.util.UUID;

import org.hibernate.annotations.DynamicUpdate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jp.tubeboard.common.model.Audit;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 変更した列だけを UPDATE する。出演者の保存が、読み込み後にゴミ箱へ移された deleted_at を書き戻さないようにするため
@DynamicUpdate
@Table(name = "setting_sheet_submissions")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SettingSheetSubmission extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_id", nullable = false)
    private Live live;

    @Column(name = "record_label", nullable = false, length = 255)
    private String recordLabel;

    @Column(name = "submission_status", nullable = false, length = 40)
    private String submissionStatus;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    /** 楽観ロック用。公開フォームの同時編集を検出するために使う。 */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
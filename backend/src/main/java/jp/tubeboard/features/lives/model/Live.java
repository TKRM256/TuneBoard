package jp.tubeboard.features.lives.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jp.tubeboard.common.model.Audit;
import jp.tubeboard.features.tenants.model.Tenants;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table(name = "lives")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Live extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenants tenant;

    @Column(name = "public_token", nullable = false, unique = true, length = 120)
    private String publicToken;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "date")
    private LocalDate date;

    @Column(name = "location")
    private String location;

    @Column(name = "deadline_at")
    private LocalDateTime deadlineAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 40)
    private LiveStatus status;

    @Column(name = "settings_json", columnDefinition = "TEXT")
    private String settingsJson;

    /** PDF出力のレイアウト（CanvasDocument）。未設定なら既定レイアウトを使う。 */
    @Column(name = "pdf_canvas_json", columnDefinition = "TEXT")
    private String pdfCanvasJson;
}
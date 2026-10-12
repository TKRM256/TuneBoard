package jp.tubeboard.features.lives.venueform;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jp.tubeboard.common.model.Audit;
import jp.tubeboard.features.lives.model.Live;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** ライブの PDF 書式 1 つ（背景の上、または白紙のどこへ何を書くか）。1 つのライブに複数持てる。 */
@Table(name = "live_pdf_layouts")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LivePdfLayout extends Audit {

    /** 統合前の PDF レイアウトの形。読み込むときに今の形へ直す。 */
    public static final String FORMAT_CANVAS_V1 = "CANVAS_V1";
    public static final String FORMAT_V2 = "V2";

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_id", nullable = false)
    private Live live;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "format", nullable = false, length = 20)
    private String format;

    @Column(name = "layout_json", nullable = false, columnDefinition = "TEXT")
    private String layoutJson;
}

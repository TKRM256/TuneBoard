package jp.tubeboard.features.lives.venueform.lines;

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

/** 背景ファイルの 1 ページから検出した罫線（JSON）。 */
@Table(name = "live_asset_page_lines")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveAssetPageLines extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "asset_id", nullable = false)
    private UUID assetId;

    @Column(name = "page_index", nullable = false)
    private int pageIndex;

    @Column(name = "algorithm_version", nullable = false)
    private int algorithmVersion;

    @Column(name = "lines_json", nullable = false, columnDefinition = "TEXT")
    private String linesJson;
}

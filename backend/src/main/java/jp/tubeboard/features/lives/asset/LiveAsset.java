package jp.tubeboard.features.lives.asset;

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
import jp.tubeboard.features.lives.model.Live;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** ライブに紐づくアップロードファイル（会場書式の背景・ステージの下絵）。中身は DB に持つ。 */
@Table(name = "live_assets")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveAsset extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_id", nullable = false)
    private Live live;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 40)
    private LiveAssetPurpose purpose;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "content", nullable = false)
    private byte[] content;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "meta_json", nullable = false, columnDefinition = "TEXT")
    private String metaJson;
}

package jp.tubeboard.features.lives.venueform;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jp.tubeboard.common.model.Audit;
import jp.tubeboard.features.lives.model.Live;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** ライブごとの会場書式（背景の上にどこへ何を書くか）。 */
@Table(name = "live_venue_forms")
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveVenueForm extends Audit {

    @Id
    @Column(name = "id", nullable = false, unique = true)
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_id", nullable = false, unique = true)
    private Live live;

    @Column(name = "layout_json", nullable = false, columnDefinition = "TEXT")
    private String layoutJson;
}

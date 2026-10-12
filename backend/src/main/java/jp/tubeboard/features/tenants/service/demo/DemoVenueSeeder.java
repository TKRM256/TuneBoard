package jp.tubeboard.features.tenants.service.demo;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.asset.LiveAsset;
import jp.tubeboard.features.lives.asset.LiveAssetPurpose;
import jp.tubeboard.features.lives.asset.LiveAssetService;
import jp.tubeboard.features.lives.model.Live;
import jp.tubeboard.features.lives.repository.LiveRepository;
import jp.tubeboard.features.lives.stageplot.StagePlotSettingsReader;
import jp.tubeboard.features.lives.venueform.LiveVenueForm;
import jp.tubeboard.features.lives.venueform.LiveVenueFormRepository;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.tenants.service.demo.DemoStagePlots.Kind;
import lombok.RequiredArgsConstructor;

/** 開発用のダミーデータで、ライブにステージ配置図の設定（パレット・下絵）と会場書式を入れる。 */
@Component
@RequiredArgsConstructor
public class DemoVenueSeeder {

    private final LiveAssetService assetService;
    private final LiveRepository liveRepository;
    private final LiveVenueFormRepository venueFormRepository;
    private final StagePlotSettingsReader settingsReader;
    private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

    /** 出演者が置けるアイコンと、下絵の画像を設定する。 */
    public void seedStagePlot(Live live, Kind kind) {
        LiveAsset base = assetService.storeGenerated(live, LiveAssetPurpose.STAGE_BASE, "stage-base.png",
                DemoStagePlots.baseImage("STAGE"));
        live.setStagePlotJson(settingsReader.write(DemoStagePlots.settings(kind, base.getId())));
        liveRepository.save(live);
    }

    /** 書式の PDF を背景に取り込み、項目・表の欄・印・配置図を置いた会場書式を保存する。 */
    public void seedVenueForm(Live live, Kind kind) {
        String fileName = switch (kind) {
            case BAND -> "band-form.pdf";
            case DANCE -> "dance-form.pdf";
            case FES -> "fes-form.pdf";
        };
        LiveAsset background = assetService.store(live, LiveAssetPurpose.VENUE_FORM, fileName, readPdf(fileName));
        VenueLayoutBuilder layout = switch (kind) {
            case BAND -> DemoVenueLayouts.band();
            case DANCE -> DemoVenueLayouts.dance();
            case FES -> DemoVenueLayouts.fes();
        };
        VenueFormDocument document = layout.build(background.getId(), DemoVenueLayouts.PAGE_WIDTH_MM,
                DemoVenueLayouts.PAGE_HEIGHT_MM);
        venueFormRepository.save(LiveVenueForm.builder().live(live).layoutJson(toJson(document)).build());
    }

    private static byte[] readPdf(String fileName) {
        try (InputStream in = DemoVenueSeeder.class.getResourceAsStream("/dev-seed/venue-forms/" + fileName)) {
            if (in == null) {
                throw new IllegalStateException("ダミーデータの書式がありません: " + fileName);
            }
            return in.readAllBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private String toJson(VenueFormDocument document) {
        try {
            return objectMapper.writeValueAsString(document);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("会場書式のダミーデータを作れませんでした", ex);
        }
    }
}

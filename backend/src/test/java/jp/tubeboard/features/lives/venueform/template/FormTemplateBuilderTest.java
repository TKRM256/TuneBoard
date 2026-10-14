package jp.tubeboard.features.lives.venueform.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;
import jp.tubeboard.features.lives.venueform.template.OddForms.Paper;

/** 変わった形のフォームを、いろいろな用紙に並べても崩れないこと。 */
class FormTemplateBuilderTest {

    private static final float EPS = 0.05f;
    private static final Pattern QUOTED_ID = Pattern.compile("'([A-Za-z0-9_\\-]+)'");

    private final FormTemplateBuilder builder = new FormTemplateBuilder();

    static Stream<Arguments> cases() {
        List<Arguments> out = new ArrayList<>();
        for (Map.Entry<String, SettingSheetConfigResponse> form : OddForms.all().entrySet()) {
            for (Paper paper : OddForms.PAPERS) {
                out.add(Arguments.of(form.getKey(), paper, form.getValue()));
            }
        }
        return out.stream();
    }

    @ParameterizedTest(name = "{0} / {1}")
    @MethodSource("cases")
    void 用紙からはみ出さず重ならず隠していない項目はすべて載る(String name, Paper paper, SettingSheetConfigResponse config) {
        VenueFormDocument doc = builder.build(config, paper.widthMm(), paper.heightMm());

        assertThat(doc.pages()).isNotEmpty().allSatisfy(page -> {
            assertThat(page.widthMm()).isEqualTo(paper.widthMm());
            assertThat(page.heightMm()).isEqualTo(paper.heightMm());
        });
        for (VenueElement element : doc.elements()) {
            assertThat(element.wMm()).as("幅 %s", element).isPositive();
            assertThat(element.hMm()).as("高さ %s", element).isPositive();
            assertThat(element.xMm()).isGreaterThanOrEqualTo(0f);
            assertThat(element.yMm()).isGreaterThanOrEqualTo(0f);
            assertThat(element.xMm() + element.wMm()).as("右にはみ出す %s", element).isLessThanOrEqualTo(paper.widthMm() + EPS);
            assertThat(element.yMm() + element.hMm()).as("下にはみ出す %s", element).isLessThanOrEqualTo(paper.heightMm() + EPS);
        }
        for (VenuePage page : doc.pages()) {
            List<VenueElement> onPage = doc.elements().stream().filter(e -> e.pageId().equals(page.id())).toList();
            assertThat(onPage).as("空のページ %s", page.id()).isNotEmpty();
            for (int i = 0; i < onPage.size(); i++) {
                for (int j = i + 1; j < onPage.size(); j++) {
                    assertThat(overlaps(onPage.get(i), onPage.get(j)))
                            .as("重なる %s と %s", onPage.get(i), onPage.get(j)).isFalse();
                }
            }
        }

        List<String> referenced = referencedIds(doc);
        assertThat(referenced).as("載っていない項目").containsAll(OddForms.visibleLeafIds(config));
        assertThat(referenced).as("隠した項目が載っている").filteredOn(OddForms.hiddenIds(config)::contains).isEmpty();
        List<String> plots = doc.elements().stream()
                .filter(VenueElement.StagePlotElement.class::isInstance)
                .map(e -> ((VenueElement.StagePlotElement) e).fieldId())
                .toList();
        assertThat(plots).as("配置図").hasSameElementsAs(topLevelStagePlots(config.blocks()));

        for (VenueElement element : doc.elements()) {
            if (!(element instanceof VenueElement.GridElement grid)) continue;
            double total = grid.columns().stream().mapToDouble(TableColumn::widthRatio).sum();
            assertThat(total).as("列の幅の合計").isBetween(0.99, 1.01);
            for (TableColumn column : grid.columns()) {
                if ("__index__".equals(column.fieldId())) continue;
                assertThat(column.widthRatio() * grid.wMm()).as("細すぎる列 %s", column.header()).isGreaterThanOrEqualTo(15f);
            }
        }
    }

    private static boolean overlaps(VenueElement a, VenueElement b) {
        return a.xMm() < b.xMm() + b.wMm() - EPS && b.xMm() < a.xMm() + a.wMm() - EPS
                && a.yMm() < b.yMm() + b.hMm() - EPS && b.yMm() < a.yMm() + a.hMm() - EPS;
    }

    private static List<String> referencedIds(VenueFormDocument doc) {
        List<String> ids = new ArrayList<>();
        for (VenueElement element : doc.elements()) {
            if (!(element instanceof VenueElement.GridElement grid)) continue;
            if (grid.source() instanceof TableSource.FieldsSource fields) {
                fields.fields().forEach(ref -> ids.add(ref.fieldId()));
            }
            for (TableColumn column : grid.columns()) {
                if (column.fieldId() != null && !column.fieldId().isBlank()) ids.add(column.fieldId());
                if (column.format() != null) {
                    Matcher matcher = QUOTED_ID.matcher(column.format());
                    while (matcher.find()) ids.add(matcher.group(1));
                }
            }
        }
        return ids;
    }

    private static List<String> topLevelStagePlots(List<FormBlockResponse> blocks) {
        List<String> out = new ArrayList<>();
        for (FormBlockResponse block : blocks) {
            if (Boolean.TRUE.equals(block.hidden())) continue;
            if ("STAGE_PLOT".equals(block.type())) out.add(block.id());
            if ("SECTION".equals(block.type())) out.addAll(topLevelStagePlots(block.fields()));
        }
        return out;
    }
}

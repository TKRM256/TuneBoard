package jp.tubeboard.features.lives.venueform;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Component;

import jp.tubeboard.common.exception.BadRequestException;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableColumn;
import jp.tubeboard.features.lives.pdf.canvas.CanvasSchema.TableSource;
import jp.tubeboard.features.lives.stageplot.icon.IconNode;
import jp.tubeboard.features.lives.stageplot.icon.IconNodeValidator;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueElement;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenueFormDocument;
import jp.tubeboard.features.lives.venueform.VenueFormSchema.VenuePage;

/**
 * 保存・出力の前に PDF 書式の形を確かめる。公開されていない API とはいえ、
 * 巨大な値や壊れた参照で描画が落ちたりメモリを使い切ったりしないよう上限を設ける。
 */
@Component
public class VenueFormValidator {

    static final int MAX_PAGES = 30;
    static final int MAX_ELEMENTS = 1000;
    private static final int MAX_ID = 64;
    private static final int MAX_REF = 128;
    private static final int MAX_CONTENT = 10_000;
    private static final int MAX_CONDITION = 2_000;
    private static final int MAX_COLUMNS = 20;
    private static final int MAX_ROWS = 200;
    private static final Set<String> SHAPES = Set.of("ellipse", "rect", "line");
    private static final Set<String> PLOT_MODES = Set.of("icons", "withBase");

    /**
     * @param assetPageCounts 背景に使えるファイルと、そのページ数
     */
    public void validate(VenueFormDocument document, Map<UUID, Integer> assetPageCounts) {
        if (document == null || document.pages() == null || document.elements() == null) {
            throw invalid("ページと要素の一覧が必要です");
        }
        if (document.pages().size() > MAX_PAGES) {
            throw invalid("ページは" + MAX_PAGES + "枚までです");
        }
        if (document.elements().size() > MAX_ELEMENTS) {
            throw invalid("要素は" + MAX_ELEMENTS + "個までです");
        }
        Set<String> pageIds = new HashSet<>();
        for (VenuePage page : document.pages()) {
            validatePage(page, assetPageCounts);
            if (!pageIds.add(page.id())) {
                throw invalid("ページのIDが重複しています");
            }
        }
        Set<String> elementIds = new HashSet<>();
        for (VenueElement element : document.elements()) {
            validateElement(element, pageIds);
            if (!elementIds.add(element.id())) {
                throw invalid("要素のIDが重複しています");
            }
        }
    }

    private void validatePage(VenuePage page, Map<UUID, Integer> assetPageCounts) {
        if (page == null) {
            throw invalid("空のページがあります");
        }
        requireText(page.id(), MAX_ID, "ページのID");
        requireRange(page.widthMm(), 10f, 1500f, "ページの幅");
        requireRange(page.heightMm(), 10f, 1500f, "ページの高さ");
        if (page.marginMm() != null) {
            requireRange(page.marginMm(), 0f, Math.min(page.widthMm(), page.heightMm()) / 3f, "ページの余白");
        }
        if (page.background() == null) {
            return;
        }
        Integer pageCount = page.background().assetId() == null ? null
                : assetPageCounts.get(page.background().assetId());
        int index = page.background().pageIndex() == null ? 0 : page.background().pageIndex();
        if (pageCount == null || index < 0 || index >= pageCount) {
            throw invalid("背景のファイルが見つかりません");
        }
    }

    private void validateElement(VenueElement element, Set<String> pageIds) {
        if (element == null) {
            throw invalid("空の要素があります");
        }
        requireText(element.id(), MAX_ID, "要素のID");
        if (element.pageId() == null || !pageIds.contains(element.pageId())) {
            throw invalid("要素のページが見つかりません");
        }
        requireRange(element.xMm(), -2000f, 2000f, "要素の位置");
        requireRange(element.yMm(), -2000f, 2000f, "要素の位置");
        requireRange(element.wMm(), 0.1f, 2000f, "要素の大きさ");
        requireRange(element.hMm(), 0.1f, 2000f, "要素の大きさ");
        optionalText(element.condition(), MAX_CONDITION, "表示条件");

        switch (element) {
            case VenueElement.TextElement t -> optionalText(t.content(), MAX_CONTENT, "テキスト");
            case VenueElement.FieldElement f -> optionalText(f.fieldId(), MAX_REF, "項目");
            case VenueElement.TableElement t -> validateTable(t);
            case VenueElement.GridElement g -> validateGrid(g);
            case VenueElement.IconElement i -> validateIcon(i.iconName(), i.nodes());
            case VenueElement.ShapeElement s -> {
                if (s.shape() == null || !SHAPES.contains(s.shape())) {
                    throw invalid("図形の種類が正しくありません");
                }
            }
            case VenueElement.StagePlotElement p -> {
                optionalText(p.fieldId(), MAX_REF, "配置図の項目");
                optionalText(p.groupId(), MAX_REF, "配置図のグループ");
                if (p.mode() != null && !PLOT_MODES.contains(p.mode())) {
                    throw invalid("配置図の描き方が正しくありません");
                }
                if (p.itemIndex() != null && (p.itemIndex() < 1 || p.itemIndex() > 1000)) {
                    throw invalid("配置図の何件目かが正しくありません");
                }
            }
        }
    }

    private void validateTable(VenueElement.TableElement table) {
        optionalText(table.groupId(), MAX_REF, "表のグループ");
        validateColumns(table.columns());
        if (table.maxRows() == null || table.maxRows() < 1 || table.maxRows() > MAX_ROWS) {
            throw invalid("表の行数は1〜" + MAX_ROWS + "にしてください");
        }
        if (table.startIndex() != null && (table.startIndex() < 1 || table.startIndex() > 1000)) {
            throw invalid("表の開始位置が正しくありません");
        }
    }

    private void validateColumns(List<TableColumn> nullableColumns) {
        List<TableColumn> columns = nullableColumns == null ? List.of() : nullableColumns;
        if (columns.size() > MAX_COLUMNS) {
            throw invalid("表の列は" + MAX_COLUMNS + "列までです");
        }
        for (TableColumn column : columns) {
            if (column == null) {
                throw invalid("空の列があります");
            }
            optionalText(column.fieldId(), MAX_REF, "列の項目");
            optionalText(column.format(), MAX_CONDITION, "列の書式");
            optionalText(column.header(), MAX_REF, "列の見出し");
        }
    }

    private void validateGrid(VenueElement.GridElement grid) {
        switch (grid.source()) {
            case null -> throw invalid("表に書く内容が選ばれていません");
            case TableSource.GroupSource group -> optionalText(group.groupId(), MAX_REF, "表のグループ");
            case TableSource.FieldsSource fields -> {
                List<TableSource.FieldRef> refs = fields.fields() == null ? List.of() : fields.fields();
                if (refs.size() > MAX_ROWS) {
                    throw invalid("表の行は" + MAX_ROWS + "行までです");
                }
                for (TableSource.FieldRef ref : refs) {
                    if (ref == null) {
                        throw invalid("空の行があります");
                    }
                    optionalText(ref.fieldId(), MAX_REF, "行の項目");
                }
            }
        }
        validateColumns(grid.columns());
    }

    private void validateIcon(String iconName, List<IconNode> nodes) {
        String problem = IconNodeValidator.check(iconName, nodes);
        if (problem != null) {
            throw invalid(problem);
        }
    }

    private static void requireText(String value, int max, String label) {
        if (value == null || value.isBlank() || value.length() > max) {
            throw invalid(label + "が正しくありません");
        }
    }

    private static void optionalText(String value, int max, String label) {
        if (value != null && value.length() > max) {
            throw invalid(label + "が長すぎます");
        }
    }

    private static void requireRange(Float value, float min, float max, String label) {
        if (value == null || !Float.isFinite(value) || value < min || value > max) {
            throw invalid(label + "が正しくありません");
        }
    }

    private static BadRequestException invalid(String detail) {
        return new BadRequestException("書式の形式が正しくありません: " + detail);
    }
}

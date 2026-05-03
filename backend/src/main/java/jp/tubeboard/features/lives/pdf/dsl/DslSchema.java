package jp.tubeboard.features.lives.pdf.dsl;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import jp.tubeboard.features.lives.pdf.PdfOrientation;
import jp.tubeboard.features.lives.pdf.PdfPaperSize;

/** Polymorphic schema describing the YAML/JSON layout DSL. */
public final class DslSchema {

    private DslSchema() {
    }

    public record DslDocument(DslPage page, DslDefaults defaults, List<DslNode> rows) {
    }

    public record DslPage(PdfPaperSize size, PdfOrientation orientation, Float margin, Float fontSize) {
    }

    public record DslDefaults(Float fontSize, String labelColor) {
    }

    @JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
    @JsonSubTypes({
            @JsonSubTypes.Type(value = DslNode.Title.class, name = "title"),
            @JsonSubTypes.Type(value = DslNode.Text.class, name = "text"),
            @JsonSubTypes.Type(value = DslNode.Field.class, name = "field"),
            @JsonSubTypes.Type(value = DslNode.Hr.class, name = "hr"),
            @JsonSubTypes.Type(value = DslNode.Space.class, name = "space"),
            @JsonSubTypes.Type(value = DslNode.Row.class, name = "row"),
            @JsonSubTypes.Type(value = DslNode.Section.class, name = "section"),
            @JsonSubTypes.Type(value = DslNode.Table.class, name = "table"),
            @JsonSubTypes.Type(value = DslNode.ForEach.class, name = "for-each"),
            @JsonSubTypes.Type(value = DslNode.If.class, name = "if"),
    })
    public sealed interface DslNode {

        record Title(String text, Float size, Boolean bold) implements DslNode {
        }

        record Text(String text, String label, Float size, String align, Boolean bold, String color)
                implements DslNode {
        }

        record Field(String fieldId, String label, String format) implements DslNode {
        }

        record Hr() implements DslNode {
        }

        record Space(Float height) implements DslNode {
        }

        record Row(List<DslColumn> columns, Float gap) implements DslNode {
        }

        record Section(String title, String description, DslChildren render) implements DslNode {
        }

        record Table(List<TableColumn> columns, String rows, String rowVar, Boolean striped)
                implements DslNode {
        }

        record ForEach(String items, String as, DslChildren render) implements DslNode {
        }

        record If(String cond,
                @com.fasterxml.jackson.annotation.JsonProperty("then") DslChildren thenBranch,
                @com.fasterxml.jackson.annotation.JsonProperty("else") DslChildren elseBranch)
                implements DslNode {
        }
    }

    public record DslColumn(Float width, DslChildren render) {
    }

    public record TableColumn(String header, String value, Float width, String align) {
    }

    /**
     * Wrapper that accepts either a single node or an array of nodes for the
     * {@code render}/{@code then}/{@code else} positions.
     */
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = DslChildrenDeserializer.class)
    public record DslChildren(List<DslNode> nodes) {

        public static DslChildren of(List<DslNode> nodes) {
            return new DslChildren(nodes == null ? List.of() : nodes);
        }
    }
}

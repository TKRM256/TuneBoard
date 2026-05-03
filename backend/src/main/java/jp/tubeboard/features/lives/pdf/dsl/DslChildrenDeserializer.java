package jp.tubeboard.features.lives.pdf.dsl;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslChildren;
import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslNode;

/** Accepts either a single object or an array for the children fields in the DSL. */
public class DslChildrenDeserializer extends JsonDeserializer<DslChildren> {

    @Override
    public DslChildren deserialize(JsonParser parser, DeserializationContext ctxt) throws IOException {
        JsonToken token = parser.currentToken();
        if (token == JsonToken.START_ARRAY) {
            List<DslNode> nodes = new ArrayList<>();
            while (parser.nextToken() != JsonToken.END_ARRAY) {
                nodes.add(parser.readValueAs(DslNode.class));
            }
            return DslChildren.of(nodes);
        }
        if (token == JsonToken.START_OBJECT) {
            DslNode node = parser.readValueAs(DslNode.class);
            return DslChildren.of(List.of(node));
        }
        if (token == JsonToken.VALUE_NULL) {
            return DslChildren.of(List.of());
        }
        throw ctxt.wrongTokenException(parser, DslChildren.class, JsonToken.START_OBJECT,
                "Expected object, array, or null for DSL children.");
    }
}

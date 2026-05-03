package jp.tubeboard.features.lives.pdf.dsl;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;

import jp.tubeboard.features.lives.pdf.dsl.DslSchema.DslDocument;

/** Parses YAML or JSON text into a {@link DslDocument}, mapping errors to {@link DslException}. */
@Component
public class DslParser {

    private final ObjectMapper yamlMapper;

    public DslParser() {
        this.yamlMapper = JsonMapper.builder(new YAMLFactory()).findAndAddModules().build();
    }

    public DslDocument parse(String yamlOrJson) {
        if (yamlOrJson == null || yamlOrJson.isBlank()) {
            throw new DslException("カスタムレイアウトが空です。", null, null, "$");
        }
        try {
            DslDocument doc = yamlMapper.readValue(yamlOrJson, DslDocument.class);
            if (doc == null) {
                throw new DslException("レイアウトのルートが見つかりません。", null, null, "$");
            }
            return doc;
        } catch (JsonProcessingException ex) {
            Integer line = ex.getLocation() != null ? ex.getLocation().getLineNr() : null;
            Integer column = ex.getLocation() != null ? ex.getLocation().getColumnNr() : null;
            throw new DslException(extractMessage(ex), ex, line, column, "$");
        }
    }

    private String extractMessage(JsonProcessingException ex) {
        String original = ex.getOriginalMessage();
        return original != null && !original.isBlank() ? original : ex.getMessage();
    }
}

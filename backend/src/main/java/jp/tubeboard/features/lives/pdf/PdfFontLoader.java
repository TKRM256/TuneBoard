package jp.tubeboard.features.lives.pdf;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Loads the bundled IPAex Gothic font once into memory and provides
 * per-document {@link PDType0Font} instances. Required because PDFBox embeds
 * fonts at the document level.
 */
@Component
public class PdfFontLoader {

    private static final String FONT_RESOURCE = "/fonts/ipaexg.ttf";

    private byte[] fontBytes;

    @PostConstruct
    void loadOnStartup() throws IOException {
        try (InputStream is = getClass().getResourceAsStream(FONT_RESOURCE)) {
            if (is == null) {
                throw new IllegalStateException("PDF font resource not found: " + FONT_RESOURCE);
            }
            this.fontBytes = is.readAllBytes();
        }
    }

    public PDType0Font load(PDDocument document) throws IOException {
        return PDType0Font.load(document, new ByteArrayInputStream(fontBytes), true);
    }
}

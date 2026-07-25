package jp.tubeboard.features.lives.pdf;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Loads the bundled fonts once into memory and provides per-document
 * {@link FontChain} instances. Required because PDFBox embeds fonts at the
 * document level.
 *
 * IPAexGothic is the primary font (Japanese + basic Latin). NotoSans and
 * NotoSansKR are fallbacks for scripts IPAexGothic doesn't cover (e.g.
 * Cyrillic, Greek, extended Latin, Hangul) that can show up in song/artist
 * names pulled from the iTunes catalog.
 */
@Component
public class PdfFontLoader {

    private static final String PRIMARY_FONT_RESOURCE = "/fonts/ipaexg.ttf";
    private static final String FALLBACK_LATIN_FONT_RESOURCE = "/fonts/notosans.ttf";
    private static final String FALLBACK_KR_FONT_RESOURCE = "/fonts/notosanskr.ttf";

    private byte[] primaryFontBytes;
    private byte[] fallbackLatinFontBytes;
    private byte[] fallbackKrFontBytes;

    @PostConstruct
    void loadOnStartup() throws IOException {
        primaryFontBytes = readResource(PRIMARY_FONT_RESOURCE);
        fallbackLatinFontBytes = readResource(FALLBACK_LATIN_FONT_RESOURCE);
        fallbackKrFontBytes = readResource(FALLBACK_KR_FONT_RESOURCE);
    }

    private byte[] readResource(String resource) throws IOException {
        try (InputStream is = getClass().getResourceAsStream(resource)) {
            if (is == null) {
                throw new IllegalStateException("PDF font resource not found: " + resource);
            }
            return is.readAllBytes();
        }
    }

    /** Ordered fallback chain: primary font first, then broader-coverage fonts for scripts it lacks. */
    public FontChain loadFontChain(PDDocument document) throws IOException {
        return new FontChain(List.of(
                PDType0Font.load(document, new ByteArrayInputStream(primaryFontBytes), true),
                PDType0Font.load(document, new ByteArrayInputStream(fallbackLatinFontBytes), true),
                PDType0Font.load(document, new ByteArrayInputStream(fallbackKrFontBytes), true)));
    }
}

package jp.tubeboard.features.lives.dto.response;

import java.util.List;

public record PdfCanvasMeasureResponse(List<TableMeasurement> tables) {

    /**
     * @param requiredHeightMm height the table needs for every row of the measured
     *                         submission, header included
     */
    public record TableMeasurement(String elementId, float requiredHeightMm) {
    }
}

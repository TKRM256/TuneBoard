package jp.tubeboard.features.lives.pdf;

/** Per-field toggles for the page header band. */
public record PdfHeaderOptions(
        Boolean showTenantName,
        Boolean showLiveName,
        Boolean showLiveDate,
        Boolean showLiveLocation,
        Boolean showRecordLabel,
        Boolean showSubmittedAt,
        Boolean showSubmissionStatus) {

    public static PdfHeaderOptions defaults() {
        return new PdfHeaderOptions(true, true, true, true, true, true, false);
    }

    public PdfHeaderOptions withDefaults() {
        PdfHeaderOptions d = defaults();
        return new PdfHeaderOptions(
                showTenantName != null ? showTenantName : d.showTenantName,
                showLiveName != null ? showLiveName : d.showLiveName,
                showLiveDate != null ? showLiveDate : d.showLiveDate,
                showLiveLocation != null ? showLiveLocation : d.showLiveLocation,
                showRecordLabel != null ? showRecordLabel : d.showRecordLabel,
                showSubmittedAt != null ? showSubmittedAt : d.showSubmittedAt,
                showSubmissionStatus != null ? showSubmissionStatus : d.showSubmissionStatus);
    }
}

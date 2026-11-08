import { parseMeasurement } from "./measurement";
import { RequestInputError } from "./request-json";
export function targetSubmissionContext(data: Record<string, unknown>) {
    const measurement = data.measurement == null ? null : parseMeasurement(data.measurement);
    const headphoneType = data.headphoneType === "ie" || data.headphoneType === "oe" ? data.headphoneType : null;
    const submissionKind = data.submissionKind ?? "target";
    if (submissionKind !== "target" && submissionKind !== "device-eq")
        throw new RequestInputError("Choose target curve or device-specific EQ.", 400);
    const referenceSystem = data.referenceSystem == null ? "Unknown" : String(data.referenceSystem).trim().replace(/\s+/g," ");
    if (!referenceSystem || referenceSystem.length > 120 || /[\x00-\x1f\x7f]/.test(referenceSystem))
        throw new RequestInputError("Enter the intended measurement/reference system, or Unknown.", 400);
    return { measurement, headphoneType, referenceSystem, submissionKind };
}

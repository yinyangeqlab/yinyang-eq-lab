import { curveVersion } from "@/lib/curve-version";
import { targetHeadphoneType } from "@/lib/target-type";
export function targetContextVersion(target: {
    points: string | unknown;
    name?: string;
    measurement?: string | null;
    headphoneType?: unknown;
    referenceSystem?: string;
    submissionKind?: string;
}) { return curveVersion({ points: typeof target.points === 'string' ? JSON.parse(target.points) : target.points, headphoneType: targetHeadphoneType(target), referenceSystem: target.referenceSystem || 'Unknown', submissionKind: target.submissionKind || 'target' }); }

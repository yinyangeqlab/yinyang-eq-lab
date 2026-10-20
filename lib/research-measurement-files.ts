export const MEASUREMENT_FILE_LIMIT = 4_000_000;
export const MEASUREMENT_CHUNK_BYTES = 500_000;
export const measurementKinds = ["single", "left", "right"] as const;
export type MeasurementFileKind = typeof measurementKinds[number];
export type MeasurementFileRecord = { kind: MeasurementFileKind; name: string; points: number; sha256: string; bytes: number; chunks: number };

export function encodeMeasurementChunks(bytes: Uint8Array): string[] {
  const result: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += MEASUREMENT_CHUNK_BYTES) {
    const chunk = bytes.subarray(offset, offset + MEASUREMENT_CHUNK_BYTES);
    let binary = "";
    for (let i = 0; i < chunk.length; i += 16_384)
      binary += String.fromCharCode(...chunk.subarray(i, i + 16_384));
    result.push(btoa(binary));
  }
  return result;
}

export async function measurementFileHash(bytes: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>));
  return Array.from(hash, byte => byte.toString(16).padStart(2, "0")).join("");
}

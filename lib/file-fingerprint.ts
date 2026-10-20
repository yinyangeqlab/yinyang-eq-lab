/** A file identity is a complete SHA-256 digest, independent of descriptive tags. */
export function fileFingerprint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const hash = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(hash) ? hash : null;
}

/** Read only provenance already retained by the submission's sharing policy. */
export function runFileFingerprint(researchContext: string | null | undefined): string | null {
  try {
    const context: unknown = JSON.parse(researchContext || "null");
    if (!context || typeof context !== "object" || Array.isArray(context)) return null;
    return fileFingerprint((context as Record<string, unknown>).sha256);
  } catch {
    return null;
  }
}

// A nickname labels an already-authenticated account; it never proves identity.
export function normalizeListenerNickname(value: unknown): string | null {
  if (typeof value !== "string" || /[\p{Cc}\p{Cf}]/u.test(value)) return null;
  const nickname = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (Array.from(nickname).length > 40 || nickname.includes("@")) return null;
  return nickname;
}

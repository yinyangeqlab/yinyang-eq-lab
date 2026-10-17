export const feedbackReasons = ["Sounds harsh", "Too bright", "Too dark", "Too muddy", "Too loud", "Too quiet"] as const;

export function cleanFeedback(data: Record<string, unknown>) {
  const reasonSide = data.reasonSide === "b" ? "b" : "a";
  const reasonTags = Array.isArray(data.reasonTags)
    ? [...new Set(data.reasonTags.filter((value): value is string => typeof value === "string" && feedbackReasons.includes(value as typeof feedbackReasons[number])))]
    : [];
  const otherReason = typeof data.otherReason === "string"
    ? data.otherReason.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160)
    : "";
  return { reasonSide, reasonTags, otherReason };
}

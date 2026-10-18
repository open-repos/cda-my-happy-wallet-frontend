export type FeedbackKind = "loading" | "empty" | "error" | "success";

export const getFeedbackAccessibility = (kind: FeedbackKind) => ({
  liveRegion: kind === "error" ? ("assertive" as const) : ("polite" as const),
  role: kind === "error" ? ("alert" as const) : ("summary" as const),
});

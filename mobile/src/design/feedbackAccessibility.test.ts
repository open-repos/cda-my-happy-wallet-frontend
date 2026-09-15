import { describe, expect, it } from "vitest";

import { getFeedbackAccessibility } from "@/src/design/feedbackAccessibility";

describe("getFeedbackAccessibility", () => {
  it("announces errors immediately as alerts", () => {
    expect(getFeedbackAccessibility("error")).toEqual({
      liveRegion: "assertive",
      role: "alert",
    });
  });

  it.each(["loading", "empty", "success"] as const)(
    "announces the %s state politely",
    (kind) => {
      expect(getFeedbackAccessibility(kind)).toEqual({
        liveRegion: "polite",
        role: "summary",
      });
    },
  );
});

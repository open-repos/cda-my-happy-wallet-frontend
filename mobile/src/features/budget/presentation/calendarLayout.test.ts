import { describe, expect, it } from "vitest";
import { calendarGridWidth } from "./calendarLayout";

describe("calendar touch targets and large fonts", () => {
  it.each([1, 1.5, 2, 3])(
    "keeps seven distinct targets at fontScale %s on 320 px",
    (scale) => {
      for (const mode of ["markers", "expenses", "forecast"] as const) {
        const width = calendarGridWidth(278, mode, scale);
        expect(width / 7).toBeGreaterThanOrEqual(48 * scale);
        if (mode === "forecast")
          expect(width / 7).toBeGreaterThanOrEqual(96 * scale);
      }
    },
  );
  it("fills wider viewports and never shrinks below the default font size", () => {
    expect(calendarGridWidth(1200, "forecast", 1)).toBe(1200);
    expect(calendarGridWidth(278, "forecast", 0.8)).toBe(672);
  });
});

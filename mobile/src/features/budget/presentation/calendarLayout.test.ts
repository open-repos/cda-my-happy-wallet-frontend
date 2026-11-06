import { describe, expect, it } from "vitest";
import {
  CALENDAR_AMOUNT_TEXT_PROPS,
  calendarGridWidth,
} from "./calendarLayout";

describe("seven calendar columns without horizontal scrolling", () => {
  it.each([1, 1.3, 2, 3])(
    "keeps the Pixel 5 grid inside the available width at fontScale %s",
    (fontScale) => {
      for (const mode of ["markers", "expenses", "forecast"] as const) {
        const width = calendarGridWidth(364, mode, fontScale);
        expect(width).toBe(364);
        expect(width / 7).toBeGreaterThanOrEqual(48);
      }
    },
  );

  it.each([278, 350, 1200])(
    "fills the available %s dp equally in every mode, independently of fontScale",
    (availableWidth) => {
      for (const fontScale of [1, 1.3, 2]) {
        for (const mode of ["markers", "expenses", "forecast"] as const) {
          expect(calendarGridWidth(availableWidth, mode, fontScale)).toBe(
            availableWidth,
          );
        }
      }
    },
  );
});

describe("compact calendar amount font contract", () => {
  it("follows the system font only up to 1.3 without truncation or automatic shrinking", () => {
    expect(CALENDAR_AMOUNT_TEXT_PROPS.allowFontScaling).toBe(true);
    expect(CALENDAR_AMOUNT_TEXT_PROPS.maxFontSizeMultiplier).toBe(1.3);
    expect(CALENDAR_AMOUNT_TEXT_PROPS.adjustsFontSizeToFit).toBe(false);
    expect(CALENDAR_AMOUNT_TEXT_PROPS).not.toHaveProperty("numberOfLines");
  });
});

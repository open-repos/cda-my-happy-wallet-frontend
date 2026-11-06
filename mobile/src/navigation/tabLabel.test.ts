import { describe, expect, it } from "vitest";

import {
  TAB_LABEL_MAX_FONT_SCALE,
  TAB_LABEL_TEXT_PROPS,
  tabLabelFontSize,
} from "@/src/navigation/tabLabel";

describe("tab labels with large fonts (#155)", () => {
  it("follows the system scale up to 1.3, then stays bounded", () => {
    expect(tabLabelFontSize(12, 1)).toBe(12);
    expect(tabLabelFontSize(12, 1.3)).toBeCloseTo(15.6);
    expect(tabLabelFontSize(12, 2)).toBeCloseTo(15.6);
  });

  it("shrinks to one line instead of truncating", () => {
    expect(TAB_LABEL_TEXT_PROPS).toMatchObject({
      adjustsFontSizeToFit: true,
      maxFontSizeMultiplier: TAB_LABEL_MAX_FONT_SCALE,
      numberOfLines: 1,
    });
    expect(TAB_LABEL_TEXT_PROPS.minimumFontScale).toBeGreaterThan(0);
    expect(TAB_LABEL_TEXT_PROPS.minimumFontScale).toBeLessThan(1);
  });
});

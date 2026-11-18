import { describe, expect, it } from "vitest";

import { fabClearance, showsFab } from "./fabLayout";

describe("floating add button clearance (#407)", () => {
  it("reserves the button height above the tab bar on phones", () => {
    // Bouton : 80 + 34 + 56 = 170 du bas ; barre : 83 → 87 + 16 d'écart.
    expect(
      fabClearance({ base: 64, width: 390, insetBottom: 34, tabBarHeight: 83 }),
    ).toBe(103);
  });

  it("keeps the screen padding when it is already larger", () => {
    expect(
      fabClearance({ base: 160, width: 360, insetBottom: 0, tabBarHeight: 64 }),
    ).toBe(160);
  });

  it("keeps tablet and desktop padding, where the button is hidden", () => {
    expect(
      fabClearance({ base: 40, width: 768, insetBottom: 0, tabBarHeight: 64 }),
    ).toBe(40);
  });

  it("hides the button where a sticky action bar sits at the bottom (#420)", () => {
    expect(showsFab({ width: 360, keyboard: false, pathname: "/" })).toBe(true);
    expect(
      showsFab({ width: 360, keyboard: false, pathname: "/month-end" }),
    ).toBe(false);
    expect(showsFab({ width: 360, keyboard: true, pathname: "/" })).toBe(false);
    expect(showsFab({ width: 768, keyboard: false, pathname: "/" })).toBe(
      false,
    );
  });
});

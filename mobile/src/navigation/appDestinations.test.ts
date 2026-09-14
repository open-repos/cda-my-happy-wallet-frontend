import { describe, expect, it } from "vitest";

import { APP_DESTINATIONS } from "@/src/navigation/appDestinations";

describe("APP_DESTINATIONS", () => {
  it("exposes each Figma navigation destination exactly once", () => {
    expect(APP_DESTINATIONS.map(({ route }) => route)).toEqual([
      "index",
      "calendar",
      "goals",
      "operations",
      "profile",
    ]);
    expect(new Set(APP_DESTINATIONS.map(({ route }) => route)).size).toBe(
      APP_DESTINATIONS.length,
    );
  });

  it("provides explicit accessible labels and active icon states", () => {
    for (const destination of APP_DESTINATIONS) {
      expect(destination.label.length).toBeGreaterThan(0);
      expect(destination.accessibilityLabel.length).toBeGreaterThan(0);
      expect(destination.activeIcon).not.toBe(destination.icon);
    }
  });
});

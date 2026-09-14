import { describe, expect, it } from "vitest";

import { designTokens, semantic, themes } from "./tokens";

describe("React Native design tokens", () => {
  it("exposes typed light and dark semantic roles", () => {
    expect(designTokens.meta.defaultTheme).toBe("system");
    expect(themes.light.color.backgroundCanvas).toBe("#F4F9F0");
    expect(themes.dark.color.backgroundCanvas).toBe("#43553A");
    expect(themes.light.color.textPrimary).not.toBe(
      themes.dark.color.textPrimary,
    );
  });

  it("keeps shared dimensions numeric for React Native", () => {
    expect(semantic.space.card).toBe(24);
    expect(semantic.radius.control).toBe(6);
    expect(semantic.size.controlMinHeight).toBe(48);
  });
});

import { describe, expect, it } from "vitest";
import tokens from "../../design-tokens/tokens.json";
import {
  CATEGORY_PALETTE,
  toCategoryPayload,
  validateCategory,
} from "../../src/js/utils/categoryForm";

describe("category form rules", () => {
  it("builds its palette from the design token primitives", () => {
    const primitives = Object.values(tokens.primitive.color);
    expect(CATEGORY_PALETTE.length).toBeGreaterThanOrEqual(6);
    for (const swatch of CATEGORY_PALETTE) {
      expect(primitives).toContain(swatch.value);
      expect(swatch.label).toMatch(/\S/);
    }
    expect(new Set(CATEGORY_PALETTE.map(({ value }) => value)).size).toBe(
      CATEGORY_PALETTE.length
    );
  });

  it("requires a trimmed name of 2 to 50 characters", () => {
    expect(validateCategory({ name: " a ", color: null }).name).toBeDefined();
    expect(
      validateCategory({ name: "x".repeat(51), color: null }).name
    ).toBeDefined();
    expect(validateCategory({ name: "  Loisirs  ", color: null })).toEqual({});
  });

  it("accepts no color or a six digit hexadecimal color", () => {
    expect(validateCategory({ name: "Loisirs", color: "#abc" }).color).toBe(
      "Choisissez une couleur au format #RRGGBB."
    );
    expect(validateCategory({ name: "Loisirs", color: "#a1B2c3" })).toEqual({});
  });

  it("normalizes the payload sent to the API", () => {
    expect(toCategoryPayload({ name: "  Loisirs ", color: "#a1b2c3" })).toEqual(
      { name: "Loisirs", color: "#A1B2C3" }
    );
    expect(toCategoryPayload({ name: "Loisirs", color: "" })).toEqual({
      name: "Loisirs",
      color: null,
    });
  });
});

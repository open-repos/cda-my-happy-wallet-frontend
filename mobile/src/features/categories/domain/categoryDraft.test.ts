import { describe, expect, it } from "vitest";

import { primitives } from "@/src/design/tokens";
import {
  CATEGORY_PALETTE,
  categoryErrorMessage,
  toCategoryPayload,
  validateCategoryDraft,
} from "@/src/features/categories/domain/categoryDraft";

describe("category draft", () => {
  it("offers the same token palette as the Web", () => {
    expect(CATEGORY_PALETTE.map(({ value }) => value)).toEqual([
      primitives.color.green800,
      primitives.color.blue600,
      primitives.color.coral500,
      primitives.color.orange400,
      primitives.color.yellow800,
      primitives.color.red700,
      primitives.color.green700,
      primitives.color.neutral700,
    ]);
    expect(CATEGORY_PALETTE.map(({ label }) => label)).toContain("Bleu");
  });

  it("requires a trimmed name of 2 to 50 characters", () => {
    expect(validateCategoryDraft({ name: " a ", color: null }).name).toBe(
      "Le nom doit contenir entre 2 et 50 caractères.",
    );
    expect(
      validateCategoryDraft({ name: "x".repeat(51), color: null }).name,
    ).toBeDefined();
    expect(validateCategoryDraft({ name: " Loisirs ", color: null })).toEqual(
      {},
    );
  });

  it("accepts no color or a six digit hexadecimal color", () => {
    expect(
      validateCategoryDraft({ name: "Loisirs", color: "#abc" }).color,
    ).toBe("Saisissez une couleur au format #RRGGBB.");
    expect(
      validateCategoryDraft({ name: "Loisirs", color: "#a1B2c3" }),
    ).toEqual({});
  });

  it("sends a normalized name and color, never the icon", () => {
    expect(
      toCategoryPayload({ name: "  Loisirs ", color: "#a1b2c3" }),
    ).toStrictEqual({ name: "Loisirs", color: "#A1B2C3" });
    expect(toCategoryPayload({ name: "Loisirs", color: "" })).toStrictEqual({
      name: "Loisirs",
      color: null,
    });
  });

  it("explains each stable API error", () => {
    expect(categoryErrorMessage("CATEGORY_NAME_CONFLICT")).toContain(
      "porte déjà ce nom",
    );
    expect(categoryErrorMessage("CATEGORY_IN_USE")).toContain(
      "utilisée par des opérations",
    );
    expect(categoryErrorMessage("CATEGORY_NOT_FOUND")).toContain(
      "n’existe plus",
    );
    expect(categoryErrorMessage(null)).toBe(
      "La catégorie n’a pas pu être enregistrée. Réessayez.",
    );
  });
});

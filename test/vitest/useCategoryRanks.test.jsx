import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCategoryRanks } from "../../src/js/hooks/useCategoryRanks";
import { categoryService } from "../../src/js/services/categoryService";
import {
  paletteColor,
  paletteIndexOf,
  paletteRanks,
} from "../../src/js/utils/categoryPalette";

vi.mock("../../src/js/services/categoryService", () => ({
  categoryService: { listAll: vi.fn() },
}));

const categories = [
  { id: 9, name: "Transport", color: "#275DAD" },
  { id: 5, name: "Autres", color: null },
  { id: 2, name: "Loisir", color: null },
];

describe("category palette ranks (#172)", () => {
  it("ranks uncolored categories by id; others come after", () => {
    const ranks = paletteRanks(categories);
    expect([...ranks]).toEqual([
      [2, 0],
      [5, 1],
    ]);
    expect(paletteIndexOf(ranks, 9)).toBe(2);
    expect(paletteIndexOf(ranks, 42)).toBe(2);
  });

  it("cycles the palette and falls back to the expense color", () => {
    const tokens = { expense: "#cc3300", categories: ["#1", "#2", "#3"] };
    expect(paletteColor(4, tokens)).toBe("#2");
    expect(paletteColor(0, { expense: "#cc3300", categories: [] })).toBe(
      "#cc3300"
    );
  });

  it("loads the ranks once, and settles without ranks when loading fails", async () => {
    categoryService.listAll.mockResolvedValueOnce(categories);
    const { result, rerender } = renderHook(() => useCategoryRanks());
    expect(result.current).toEqual({ ranks: null, settled: false });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.ranks.get(5)).toBe(1);
    rerender();
    expect(categoryService.listAll).toHaveBeenCalledTimes(1);

    categoryService.listAll.mockRejectedValueOnce(new Error("offline"));
    const failed = renderHook(() => useCategoryRanks());
    await waitFor(() => expect(failed.result.current.settled).toBe(true));
    expect(failed.result.current.ranks).toBeNull();
  });
});

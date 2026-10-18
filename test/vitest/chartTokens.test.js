import { afterEach, describe, expect, it } from "vitest";
import { readChartTokens } from "../../src/js/components/charts/useChartTokens";

describe("readChartTokens", () => {
  afterEach(() => document.documentElement.removeAttribute("style"));

  it("reads the category palette from the design tokens (#172)", () => {
    const root = document.documentElement;
    root.style.setProperty("--ds-color-data-expense", "#a30707");
    for (let rank = 1; rank <= 6; rank += 1)
      root.style.setProperty(
        `--ds-color-data-category${rank}`,
        `#00000${rank}`
      );

    const tokens = readChartTokens();

    expect(tokens.expense).toBe("#a30707");
    expect(tokens.categories).toEqual([
      "#000001",
      "#000002",
      "#000003",
      "#000004",
      "#000005",
      "#000006",
    ]);
  });

  it("returns an empty palette when the tokens are missing", () => {
    expect(readChartTokens().categories).toEqual([]);
  });

  it("drops an incomplete palette instead of shifting the ranks", () => {
    const root = document.documentElement;
    for (let rank = 1; rank <= 5; rank += 1)
      root.style.setProperty(`--ds-color-data-category${rank}`, "#123456");
    expect(readChartTokens().categories).toEqual([]);
  });
});

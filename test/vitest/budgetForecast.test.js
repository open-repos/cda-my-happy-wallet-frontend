import { describe, expect, it } from "vitest";
import {
  forecastQueryProblem,
  shiftForecastMonth,
} from "../../src/js/utils/budgetForecast";
import { budgetForecastChartOption } from "../../src/js/components/charts/budgetForecastChartOptions";
import { budgetForecast } from "./fixtures/budgetForecast";

describe("forecast presentation", () => {
  it("bounds the start date and horizon and handles the year boundary", () => {
    const query = { from: "2026-10", months: 12, currency: "EUR" };
    expect(forecastQueryProblem(query, "2026-10-31")).toBeNull();
    expect(
      forecastQueryProblem({ ...query, from: "2026-09" }, "2026-10-01")
    ).toMatch(/mois courant/);
    expect(
      forecastQueryProblem({ ...query, from: "2028-10" }, "2026-10-01")
    ).toMatch(/23 mois/);
    expect(
      forecastQueryProblem({ ...query, months: 25 }, "2026-10-01")
    ).toMatch(/24 mois/);
    expect(shiftForecastMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftForecastMonth("2026-10", 23)).toBe("2028-09");
  });

  it("plots the API balances and distinguishes deficits with theme tokens", () => {
    const tokens = {
      text: "text",
      muted: "muted",
      grid: "grid",
      surface: "surface",
      expense: "negative",
      forecast: "positive",
      reducedMotion: true,
    };
    const option = budgetForecastChartOption(
      budgetForecast().months,
      "EUR",
      tokens
    );
    expect(option.series[0].data).toEqual([
      { value: 700, itemStyle: { color: "positive" } },
      { value: -1200, itemStyle: { color: "negative" } },
    ]);
    expect(option.animation).toBe(false);
    expect(option.xAxis.data).toEqual(["octobre 2026", "novembre 2026"]);
  });
});

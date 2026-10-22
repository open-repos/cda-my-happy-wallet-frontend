import { describe, expect, it } from "vitest";

// Fuseau très éloigné d'UTC : une grille recalculée en heure locale
// décalerait les dates civiles et ferait échouer ces tests (#216).
process.env.TZ = "Pacific/Kiritimati";

import {
  abbreviateAmount,
  dayCell,
  longDate,
  monthGrid,
  monthTitle,
  shiftMonth,
} from "@/src/features/budget/domain/budgetCalendar";
import { BudgetDay } from "@/src/features/budget/domain/budgetSummary";

const day = (overrides: Partial<BudgetDay> = {}): BudgetDay => ({
  date: "2026-10-14",
  income: "0.00",
  expense: "42.50",
  realRemaining: "1295.00",
  plannedIncome: "0.00",
  plannedExpense: "120.00",
  plannedCount: 1,
  forecastRemaining: "887.50",
  ...overrides,
});

describe("monthGrid", () => {
  it("starts on Monday and always has six full weeks", () => {
    const cells = monthGrid("2026-10", "2026-10-11");
    expect(cells).toHaveLength(42);
    // 1er octobre 2026 = jeudi : la grille commence le lundi 28 septembre.
    expect(cells[0]).toEqual({
      date: "2026-09-28",
      day: 28,
      inMonth: false,
      isToday: false,
    });
    expect(cells[3]).toMatchObject({ date: "2026-10-01", inMonth: true });
    expect(cells.find((cell) => cell.isToday)?.date).toBe("2026-10-11");
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  // Occurrences hebdomadaires, trimestrielles ou annuelles (#216) : les dates
  // civiles de l'API restent des textes, sans décalage au changement d'heure.
  it("keeps civil dates across the October daylight-saving change", () => {
    const dates = monthGrid("2026-10", "2026-10-11").map((cell) => cell.date);
    const sunday = dates.indexOf("2026-10-25");
    expect(dates.slice(sunday - 1, sunday + 2)).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
    expect(longDate("2026-10-25")).toBe("25 octobre 2026");
    expect(longDate("2027-01-20")).toBe("20 janvier 2027");
  });

  it("handles leap February", () => {
    const cells = monthGrid("2028-02", "2026-10-11");
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(29);
    expect(cells[1]).toMatchObject({ date: "2028-02-01", inMonth: true });
  });
});

describe("months", () => {
  it("shifts across years and names the month in French", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthTitle("2026-08")).toBe("août 2026");
  });
});

describe("abbreviateAmount", () => {
  it("keeps short values readable in a small cell", () => {
    expect(abbreviateAmount(4250)).toBe("43");
    expect(abbreviateAmount(-4250)).toBe("-43");
    expect(abbreviateAmount(129500)).toBe("1,3 k");
    expect(abbreviateAmount(-1000000)).toBe("-10 k");
    expect(abbreviateAmount(0)).toBe("0");
    expect(abbreviateAmount(99950)).toBe("1 k");
    expect(abbreviateAmount(99949)).toBe("999");
    expect(abbreviateAmount(-40)).toBe("0");
  });
});

describe("dayCell", () => {
  it("shows markers by default with a complete spoken label", () => {
    const cell = dayCell("2026-10-14", day(), "markers", "EUR");
    expect(cell.value).toBeNull();
    expect(cell.markers).toEqual({ operation: true, planned: true });
    expect(cell.accessibilityLabel.replace(/\s/g, " ")).toBe(
      "14 octobre 2026. Dépenses 42,50 €. 1 événement prévu.",
    );
  });

  it("shows the abbreviated expenses or forecast", () => {
    expect(dayCell("2026-10-14", day(), "expenses", "EUR").value).toBe("-43");
    expect(dayCell("2026-10-14", day(), "forecast", "EUR").value).toBe("888");
    expect(
      dayCell(
        "2026-10-14",
        day(),
        "forecast",
        "EUR",
      ).accessibilityLabel.replace(/\s/g, " "),
    ).toBe(
      "14 octobre 2026. Dépenses 42,50 €. 1 événement prévu. Reste prévisionnel 887,50 €.",
    );
  });

  it("stays quiet on a day without data and without forecast", () => {
    const empty = dayCell("2026-10-02", undefined, "forecast", "EUR");
    expect(empty).toEqual({
      value: null,
      markers: { operation: false, planned: false },
      accessibilityLabel: "2 octobre 2026. Aucune opération.",
    });
    expect(
      dayCell(
        "2026-09-02",
        day({
          date: "2026-09-02",
          expense: "0.00",
          income: "15.00",
          plannedCount: null,
          forecastRemaining: null,
        }),
        "forecast",
        "EUR",
      ).value,
    ).toBeNull();
  });

  it("does not claim anything while the month is loading", () => {
    expect(dayCell("2026-10-14", undefined, "markers", "EUR", true)).toEqual({
      value: null,
      markers: { operation: false, planned: false },
      accessibilityLabel: "14 octobre 2026. Chargement.",
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  BudgetSummary,
  parseBudgetSummary,
} from "@/src/features/budget/domain/budgetSummary";
import {
  REMAINING_PERIODS,
  remainingComparison,
  theoreticalDailyShare,
  theoreticalToDate,
} from "@/src/features/budget/domain/theoreticalRemaining";

const spaces = (text: string) => text.replace(/\s/g, " ");

// Maquette A (#391) : novembre 2026, 30 jours, théorique 905,00 €.
const summary = (overrides: Record<string, unknown> = {}): BudgetSummary =>
  parseBudgetSummary({
    month: "2026-11",
    currency: "EUR",
    status: "OPEN",
    base: "905.00",
    carryIn: "-120.00",
    carryFromMonth: "2026-10",
    actualIncome: "0.00",
    actualExpense: "66.20",
    monthResult: "838.80",
    realRemaining: "718.80",
    remainingDays: 25,
    realDailyAllowance: "28.75",
    forecast: {
      plannedIncome: "0.00",
      plannedExpense: "41.55",
      goalSavings: "100.00",
      forecastRemaining: "577.25",
      prudentDailyAllowance: "23.09",
      unresolvedCount: 0,
      overdueCount: 0,
    },
    days: [],
    ...overrides,
  });

describe("theoretical daily share (#393, server rule of dailyRemaining)", () => {
  it.each([
    ["2026-02", "1200.00", 4285], // 28 jours
    ["2028-02", "1200.00", 4137], // 29 jours
    ["2026-11", "905.00", 3016], // 30 jours : tronqué, pas arrondi
    ["2026-10", "1200.00", 3870], // 31 jours
    ["2026-11", "-100.00", -333], // tronqué vers zéro
  ])("truncates %s base %s to %i cents a day", (month, base, cents) => {
    expect(theoreticalDailyShare(summary({ month, base }))).toBe(cents);
  });
});

describe("theoretical amount acquired by a calendar date (#428)", () => {
  it.each([
    ["2026-02", 28, 4285],
    ["2028-02", 29, 4137],
    ["2026-11", 30, 4000],
    ["2026-10", 31, 3871],
  ])(
    "uses the daily share in %s and the exact base on day %i",
    (month, last, share) => {
      const budget = summary({ month, base: "1200.01" });
      expect(theoreticalToDate(budget, `${month}-01`)).toEqual({
        cents: share,
        day: 1,
        lastDay: false,
        share,
      });
      expect(theoreticalToDate(budget, `${month}-${last - 1}`).cents).toBe(
        share * (last - 1),
      );
      expect(theoreticalToDate(budget, `${month}-${last}`)).toEqual({
        cents: 120001,
        day: last,
        lastDay: true,
        share,
      });
    },
  );
});

describe("actualized compared with theoretical (#393)", () => {
  it("offers the Web periods in the mockup order", () => {
    expect(REMAINING_PERIODS.map((period) => period.label)).toEqual([
      "Mois",
      "Semaine",
      "Jour",
    ]);
  });

  it("compares today with the theoretical daily share", () => {
    const day = remainingComparison(summary(), "day");
    expect(day.caption).toBe("Reste à vivre aujourd’hui");
    expect(spaces(day.actual ?? "")).toBe("23,09 €");
    expect(spaces(day.theoretical ?? "")).toBe("30,16 €");
    expect(day.progress).toBe(77);
    expect(spaces(day.difference ?? "")).toBe(
      "7,07 € de moins par jour que votre part théorique.",
    );
    expect(spaces(day.progressLabel ?? "")).toBe(
      "Reste à vivre actualisé 23,09 € sur 30,16 € théorique",
    );
    expect(spaces(day.help)).toBe(
      "23,09 € par jour × 1 jour. Le disponible prudent répartit votre reste prévisionnel (577,25 €), qui tient compte des événements prévus et de l’épargne des objectifs, sur les 25 jours restants du mois, jour courant inclus.",
    );
  });

  it("limits the week to the days left in the month", () => {
    const week = remainingComparison(summary(), "week");
    expect(week.caption).toBe("Reste à vivre sur 7 jours");
    expect(spaces(week.actual ?? "")).toBe("161,63 €");
    expect(spaces(week.theoretical ?? "")).toBe("211,12 €");
    expect(spaces(week.difference ?? "")).toBe(
      "49,49 € de moins sur 7 jours que votre part théorique.",
    );
    const end = remainingComparison(summary({ remainingDays: 3 }), "week");
    expect(end.caption).toBe("Reste à vivre sur 3 jours");
    expect(spaces(end.theoretical ?? "")).toBe("90,48 €");
    expect(end.help).toMatch(/La semaine est limitée aux jours restants/);
    expect(
      remainingComparison(summary({ remainingDays: 1 }), "week").caption,
    ).toBe("Reste à vivre sur 1 jour");
  });

  it("compares the month with the theoretical base", () => {
    const month = remainingComparison(summary(), "month");
    expect(month.caption).toBe("Reste à vivre du mois");
    expect(spaces(month.actual ?? "")).toBe("577,25 €");
    expect(spaces(month.theoretical ?? "")).toBe("905,00 €");
    expect(month.progress).toBe(64);
    expect(spaces(month.difference ?? "")).toBe(
      "327,75 € de moins ce mois-ci que votre part théorique.",
    );
    expect(spaces(month.help)).toBe(
      "Le reste à vivre actualisé (577,25 €) part du reste réel (718,80 €), ajoute les entrées prévues et retire les dépenses prévues et l’épargne des objectifs. Le détail du calcul donne chaque montant.",
    );
  });

  it("names the envelope reserve when the server sends it", () => {
    const withReserve = summary();
    withReserve.forecast = {
      ...withReserve.forecast!,
      envelopeReserve: "10.00",
    };
    expect(remainingComparison(withReserve, "month").help).toMatch(
      /retire les dépenses prévues, la réserve des enveloppes et l’épargne/,
    );
  });

  it("uses the real remaining without forecast", () => {
    const real = summary({ forecast: null });
    const month = remainingComparison(real, "month");
    expect(spaces(month.actual ?? "")).toBe("718,80 €");
    expect(month.help).toBe("");
    const day = remainingComparison(real, "day");
    expect(spaces(day.actual ?? "")).toBe("28,75 €");
    expect(spaces(day.help)).toMatch(
      /^28,75 € par jour × 1 jour\. Le disponible réel répartit votre reste réel \(718,80 €\) sur les 25 jours/,
    );
  });

  it("says when the actualized equals or exceeds the theoretical", () => {
    const equal = summary();
    equal.forecast = { ...equal.forecast!, prudentDailyAllowance: "30.16" };
    expect(remainingComparison(equal, "day").difference).toBe(
      "Égal à votre part théorique par jour.",
    );
    const above = summary();
    above.forecast = { ...above.forecast!, prudentDailyAllowance: "40.00" };
    const day = remainingComparison(above, "day");
    expect(spaces(day.difference ?? "")).toBe(
      "9,84 € de plus par jour que votre part théorique.",
    );
    expect(day.progress).toBe(100);
  });

  it("explains a negative share and an empty bar", () => {
    const deficit = summary();
    deficit.forecast = { ...deficit.forecast!, prudentDailyAllowance: "-5.00" };
    const day = remainingComparison(deficit, "day");
    expect(day.progress).toBe(0);
    expect(day.help).toMatch(
      /Un montant négatif indique l’effort nécessaire pour finir le mois à l’équilibre\.$/,
    );
    expect(
      remainingComparison(summary({ base: "-50.00" }), "month").progress,
    ).toBe(0);
  });

  it("shows no share once the month has no day left", () => {
    const over = remainingComparison(summary({ remainingDays: 0 }), "day");
    expect(over.actual).toBeNull();
    expect(over.theoretical).toBeNull();
    expect(over.difference).toBeNull();
    expect(over.progress).toBeNull();
    expect(over.help).toBe(
      "Le mois est terminé : il ne reste aucun jour à répartir.",
    );
  });
});

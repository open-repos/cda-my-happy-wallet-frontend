import { describe, expect, it } from "vitest";

import {
  envelopeErrorMessage,
  envelopeStatusLabel,
  meterValue,
  parseEnvelopeOccurrence,
  parseEnvelopeOverview,
  parseEnvelopePayment,
  percentLabel,
  statisticsSampleLabel,
} from "./budgetEnvelope";
import {
  envelopeOccurrence,
  envelopeOverview,
  envelopePayment,
  envelopeStatistics,
  metrics,
} from "@/src/features/envelopes/testing/envelopeFixtures";

describe("budget envelope DTOs (#384, contrat Web #314)", () => {
  it("keeps the server metrics of an overview card", () => {
    const parsed = parseEnvelopeOverview(envelopeOverview());
    expect(parsed.totals).toMatchObject({
      ...metrics.available,
      observedMonths: 1,
      operationCount: 3,
    });
    expect(parsed.category?.name).toBe("Alimentation");
    expect(parsed.months[0].paymentsPreview).toHaveLength(3);
  });

  it("rejects numeric amounts, unknown states and long previews", () => {
    const overview = envelopeOverview();
    expect(() =>
      parseEnvelopeOverview({
        ...overview,
        totals: { ...overview.totals, actual: 223 },
      }),
    ).toThrow();
    expect(() =>
      parseEnvelopeOverview({
        ...overview,
        totals: { ...overview.totals, status: "OK" },
      }),
    ).toThrow();
    expect(() =>
      parseEnvelopeOverview({
        ...overview,
        months: [
          {
            ...overview.months[0],
            paymentsPreview: [...overview.months[0].paymentsPreview, {}],
          },
        ],
      }),
    ).toThrow();
  });

  it("accepts only envelope occurrences", () => {
    expect(parseEnvelopeOccurrence(envelopeOccurrence()).metrics).toEqual(
      metrics.available,
    );
    expect(() =>
      parseEnvelopeOccurrence({
        ...envelopeOccurrence(),
        sourceType: "TRACKING_ONLY",
      }),
    ).toThrow();
  });

  it("keeps the link of a payment to its occurrence", () => {
    expect(parseEnvelopePayment(envelopePayment()).occurrenceId).toBe(41);
    expect(() =>
      parseEnvelopePayment({ ...envelopePayment(), occurrenceId: "41" }),
    ).toThrow();
  });

  it("validates the statistics sample policy", () => {
    const overview = envelopeOverview();
    expect(() =>
      parseEnvelopeOverview({
        ...overview,
        statistics: { ...envelopeStatistics, overrunRate: 120 },
      }),
    ).toThrow();
  });
});

// Intl sépare montant et devise par une espace insécable.
const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

describe("budget envelope labels", () => {
  it("states availability and overrun in text, not only colour", () => {
    expect(plain(envelopeStatusLabel(metrics.available, "EUR"))).toBe(
      "✓ 77,00 € disponibles",
    );
    expect(plain(envelopeStatusLabel(metrics.exceeded, "EUR"))).toBe(
      "⚠ Dépassement de 33,00 €",
    );
    expect(
      envelopeStatusLabel({ ...metrics.available, status: "REACHED" }, "EUR"),
    ).toBe("✓ Budget atteint");
  });

  it("formats the uncapped progress and caps only the meter", () => {
    expect(plain(percentLabel(74.33))).toBe("74,33 %");
    expect(plain(percentLabel(111))).toBe("111 %");
    expect(percentLabel(null)).toBe("Sans pourcentage (prévu nul)");
    expect(meterValue(111)).toBe(100);
    expect(meterValue(null)).toBe(0);
  });

  it("explains the statistics sample like the Web", () => {
    expect(statisticsSampleLabel(envelopeStatistics)).toBe(
      "6 mois analysés ; 0 mois sans suivi complet et 0 mois courant ou futurs exclus. Les mois historiques absents ne sont pas assimilés à zéro.",
    );
  });
});

describe("envelope API errors (#389)", () => {
  it("reuses the Web messages and falls back otherwise", () => {
    expect(envelopeErrorMessage("PERIOD_CLOSED", "x")).toBe(
      "Ce mois est clôturé : ses rattachements ne sont plus modifiables.",
    );
    expect(envelopeErrorMessage("INVALID_BUDGET_ENVELOPE", "x")).toBe(
      "Une enveloppe doit être une charge mensuelle.",
    );
    expect(envelopeErrorMessage("OTHER", "Réessayez.")).toBe("Réessayez.");
    expect(envelopeErrorMessage(null, "Réessayez.")).toBe("Réessayez.");
  });
});

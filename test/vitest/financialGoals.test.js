import { describe, expect, it } from "vitest";
import {
  forecastMessage,
  goalPercent,
} from "../../src/js/utils/financialGoals";

const normalize = (text) => text.replace(/\s/g, " ");
const goal = (status, overrides = {}) => ({
  currency: "EUR",
  forecast: {
    status,
    estimatedReachMonth: "2027-04",
    requiredMonthlyContribution: null,
    ...overrides,
  },
});

describe("goalPercent", () => {
  it("floors and caps the saved share", () => {
    expect(
      goalPercent({ targetAmount: "1200.00", savedAmount: "300.00" })
    ).toBe(25);
    expect(
      goalPercent({ targetAmount: "1200.00", savedAmount: "1199.99" })
    ).toBe(99);
    expect(
      goalPercent({ targetAmount: "1200.00", savedAmount: "1500.00" })
    ).toBe(100);
  });
});

describe("forecastMessage", () => {
  it("explains every backend status", () => {
    expect(forecastMessage(goal("REACHED"))).toMatch(/Objectif atteint/);
    expect(forecastMessage(goal("ON_TRACK"))).toBe(
      "À ce rythme, objectif atteint en avril 2027, avant la date souhaitée."
    );
    expect(
      normalize(
        forecastMessage(
          goal("BEHIND", { requiredMonthlyContribution: "180.00" })
        )
      )
    ).toBe("Le versement mensuel calculé pour tenir la date est de 180,00 €.");
    expect(forecastMessage(goal("MISSED"))).toMatch(
      /passée ou tombe ce mois-ci/
    );
    expect(
      forecastMessage(goal("ON_TRACK", { estimatedReachMonth: null }))
    ).toBe("À ce rythme, objectif atteint avant la date souhaitée.");
    expect(forecastMessage(goal("NO_DEADLINE"))).toBe(
      "À ce rythme, objectif atteint en avril 2027."
    );
    expect(
      forecastMessage(goal("NO_DEADLINE", { estimatedReachMonth: null }))
    ).toMatch(/Ajoutez un versement mensuel/);
  });
});

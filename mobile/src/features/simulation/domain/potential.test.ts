import { describe, expect, it } from "vitest";

import {
  SIMULATION_FAILURE,
  potentialExpiration,
  potentialMinStartDate,
  simulationErrorMessage,
} from "@/src/features/simulation/domain/potential";

describe("simulation potentials (#241)", () => {
  it("expires on the first day of the month after the start", () => {
    expect(potentialExpiration("2026-10-31")).toBe("2026-11-01");
    expect(potentialExpiration("2026-12-01")).toBe("2027-01-01");
    expect(potentialMinStartDate("2026-10")).toBe("2026-10-01");
  });

  it("explains business refusals with the Web sentences", () => {
    expect(simulationErrorMessage("EXPIRED_POTENTIAL")).toMatch(
      /^Le mois de cet élément potentiel est passé/,
    );
    expect(simulationErrorMessage("INVALID_STATUS_TRANSITION")).toBe(
      "La confirmation doit passer par l’action Confirmer de la Simulation.",
    );
    expect(simulationErrorMessage("OTHER")).toBe(SIMULATION_FAILURE);
    expect(simulationErrorMessage(null)).toBe(SIMULATION_FAILURE);
  });
});

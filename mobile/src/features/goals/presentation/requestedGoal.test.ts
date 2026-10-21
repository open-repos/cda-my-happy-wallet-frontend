import { describe, expect, it } from "vitest";

import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";
import { requestedGoal } from "@/src/features/goals/presentation/requestedGoal";

const goal = { id: 3, title: "Vélo" } as FinancialGoal;

describe("requestedGoal (#226)", () => {
  it("opens the loaded goal once, until the request is handled", () => {
    expect(requestedGoal([goal], 3, null, false)).toBe(goal);
    // Fermée ou remplacée par une ouverture manuelle : plus d'ouverture.
    expect(requestedGoal([goal], 3, 3, false)).toBeNull();
    // Un autre identifiant est une nouvelle demande.
    expect(requestedGoal([goal, { ...goal, id: 4 }], 4, 3, false)?.id).toBe(4);
  });

  it("waits for the goal and never overrides an open form", () => {
    expect(requestedGoal([], 3, null, false)).toBeNull();
    expect(requestedGoal([goal], 3, null, true)).toBeNull();
    expect(requestedGoal([goal], null, null, false)).toBeNull();
  });
});

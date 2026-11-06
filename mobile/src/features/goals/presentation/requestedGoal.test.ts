import { describe, expect, it } from "vitest";

import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";
import {
  goalRequest,
  requestedGoal,
} from "@/src/features/goals/presentation/requestedGoal";

const goal = { id: 3, title: "Vélo" } as FinancialGoal;

describe("goal requests (#226, #217)", () => {
  it("reads ajuster and its request token", () => {
    expect(goalRequest("3", "1700")).toEqual({ goalId: 3, key: "3:1700" });
    expect(goalRequest("3", undefined)).toEqual({ goalId: 3, key: "3:" });
    expect(goalRequest("abc", "1")).toBeNull();
    expect(goalRequest(undefined, undefined)).toBeNull();
  });

  it("opens the loaded goal once per request", () => {
    const first = goalRequest("3", "1");
    expect(requestedGoal([goal], first, null, false)).toBe(goal);
    // Fermée ou remplacée par une ouverture manuelle : plus d'ouverture.
    expect(requestedGoal([goal], first, "3:1", false)).toBeNull();
    // Même objectif ajusté de nouveau : nouveau jeton, nouvelle ouverture.
    expect(requestedGoal([goal], goalRequest("3", "2"), "3:1", false)).toBe(
      goal,
    );
  });

  it("waits for the goal and never overrides an open form", () => {
    const request = goalRequest("3", "1");
    expect(requestedGoal([], request, null, false)).toBeNull();
    expect(requestedGoal([goal], request, null, true)).toBeNull();
    expect(requestedGoal([goal], null, null, false)).toBeNull();
  });
});

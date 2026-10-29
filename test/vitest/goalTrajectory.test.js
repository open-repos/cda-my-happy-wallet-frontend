import { describe, expect, it } from "vitest";
import { goalTrajectoryPoints } from "../../src/js/utils/goalTrajectory";

const goal = {
  savedAmount: "1800.00",
  targetAmount: "6000.00",
  monthlyContribution: "350.00",
  forecast: {
    referenceMonth: "2026-10",
    status: "BEHIND",
    contributionsNeeded: 12,
    estimatedReachMonth: "2027-10",
  },
};

describe("goalTrajectoryPoints", () => {
  it("starts at declared savings and samples only future monthly payments", () => {
    const points = goalTrajectoryPoints(goal, 12);
    expect(points[0]).toEqual({ month: "2026-10", amount: "1800.00" });
    expect(points[1]).toEqual({ month: "2026-11", amount: "2150.00" });
    expect(points.at(-1)).toEqual({ month: "2027-10", amount: "6000.00" });
    expect(points).toHaveLength(13);
    expect(goal.savedAmount).toBe("1800.00");
  });

  it("keeps cents exact and stops at the server contribution count", () => {
    const points = goalTrajectoryPoints({
      ...goal,
      savedAmount: "0.01",
      targetAmount: "0.32",
      monthlyContribution: "0.10",
      forecast: { ...goal.forecast, contributionsNeeded: 4 },
    });
    expect(points.map(({ amount }) => amount)).toEqual([
      "0.01",
      "0.11",
      "0.21",
      "0.31",
      "0.32",
    ]);
  });

  it("does not fabricate future growth for reached or zero-payment goals", () => {
    expect(
      goalTrajectoryPoints({ ...goal, monthlyContribution: "0.00" })
    ).toEqual([{ month: "2026-10", amount: "1800.00" }]);
    expect(
      goalTrajectoryPoints({
        ...goal,
        savedAmount: "6500.00",
        forecast: { ...goal.forecast, status: "REACHED" },
      })
    ).toEqual([{ month: "2026-10", amount: "6500.00" }]);
  });

  it("does not invent an attainment date when the server omits it", () => {
    const far = {
      ...goal,
      monthlyContribution: "0.01",
      forecast: {
        ...goal.forecast,
        contributionsNeeded: 420000,
        estimatedReachMonth: null,
      },
    };
    expect(goalTrajectoryPoints(far, 24)).toHaveLength(25);
    expect(goalTrajectoryPoints(far, 24).at(-1).amount).toBe("1800.24");
    expect(far.forecast.estimatedReachMonth).toBeNull();
  });
});

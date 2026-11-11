import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  normalizedAssumption,
  parseSavingsTrajectories,
  reachText,
  StaleGoalError,
  toTrajectoryBody,
  TrajectoryRequest,
} from "./savingsTrajectory";
import { parseFinancialGoal } from "./financialGoal";

// Fixtures générées par le backend réel (#132), partagées avec le Web #284.
const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../../../../test/fixtures/savingsTrajectories.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
);
const request: TrajectoryRequest = {
  currency: "EUR",
  scenario: "standard",
  months: 24,
  selectedGoalId: 1,
  currentRemainingVariableExpense: "100.00",
  futureAdditionalVariableExpense: "700.00",
  monthlySafetyMargin: "100.00",
};
const response = () => structuredClone(fixtures.cases["standard-24-1-true"]);
const expected = parseFinancialGoal(fixtures.goals[0]);

describe("savings trajectories contract (#285, Web #284)", () => {
  it("reads the backend acceptance example without deriving money or dates", () => {
    const parsed = parseSavingsTrajectories(response(), request, expected);
    expect(parsed.projections.reasonable.estimatedReachMonth).toBe("2027-05");
    expect(parsed.projections.maximum.estimatedReachMonth).toBe("2027-01");
    expect(parsed.projections.planned.estimatedReachMonth).toBe("2027-10");
    expect(
      parsed.projections.reasonable.current.remainingUnderAssumptions,
    ).toBe("500.00");
    expect(
      parsed.projections.reasonable.months[0].selectedPossibleContribution,
    ).toBe("650.00");
    expect(
      parsed.projections.reasonable.months[0].allocations[1]
        .reservedContribution,
    ).toBe("150.00");
  });

  it("strips private extra fields", () => {
    const data = response();
    data.ownerId = 8;
    data.goals[0].ownerId = 8;
    data.projections.reasonable.months[0].secret = "private";
    expect(
      JSON.stringify(parseSavingsTrajectories(data, request, expected)),
    ).not.toMatch(/ownerId|secret|private/);
  });

  it.each([
    (d: any) => (d.currency = "USD"),
    (d: any) => (d.scenario = "simulation"),
    (d: any) => (d.selectedGoalId = 2),
    (d: any) => (d.assumptions.monthlySafetyMargin = "0.00"),
    (d: any) => d.projections.reasonable.months.pop(),
    (d: any) => (d.projections.maximum.points[1].month = "2026-12"),
    (d: any) => (d.projections.planned.points[0].savedAmount = "0.00"),
    (d: any) => (d.projections.maximum.months[0].allocations[1].goalId = 1),
    (d: any) =>
      (d.projections.reasonable.months[0].capacityBeforeGoals =
        "90071992547410.00"),
    (d: any) => (d.projections.reasonable.points[1].fundable = false),
    (d: any) => (d.projections.maximum.estimatedReachMonth = "2099-01"),
    (d: any) => (d.projections.reasonable.reachReason = "ON_TRACK"),
  ])("rejects inconsistent or unsafe snapshots %#", (change) => {
    const data = response();
    change(data);
    expect(() => parseSavingsTrajectories(data, request, expected)).toThrow();
  });

  it("detects a concurrently changed goal rather than mixing it with the gauge", () => {
    const data = response();
    data.goals[0].savedAmount = "2000.00";
    expect(() => parseSavingsTrajectories(data, request, expected)).toThrow(
      StaleGoalError,
    );
  });

  it("keeps signed deficits and null reach estimates", () => {
    const data = response();
    const projection = data.projections.reasonable;
    projection.reachReason = "BUDGET_DEFICIT";
    projection.estimatedReachMonth = null;
    projection.months[0].freeSupplement = "-100.00";
    const parsed = parseSavingsTrajectories(data, request, expected);
    expect(parsed.projections.reasonable.months[0].freeSupplement).toBe(
      "-100.00",
    );
    expect(reachText(parsed.projections.reasonable)).toBe(
      "Budget déficitaire dans cet horizon",
    );
  });

  it.each(["zero", "reached", "deficit"])(
    "accepts the real backend %s edge contract",
    (kind) => {
      const edge = fixtures.edges[kind];
      const query = {
        ...request,
        currentRemainingVariableExpense: "0.00",
        futureAdditionalVariableExpense: "0.00",
        monthlySafetyMargin: "0.00",
      };
      expect(
        parseSavingsTrajectories(
          edge.data,
          query,
          parseFinancialGoal(edge.goal),
        ).projections.reasonable.reachReason,
      ).toBe(edge.data.projections.reasonable.reachReason);
    },
  );
});

describe("savings trajectory request", () => {
  it("sends only the Web body fields", () => {
    expect(toTrajectoryBody({ ...request, ownerId: 9 } as never)).toEqual(
      request,
    );
  });

  it.each([
    { ...request, scenario: "reasonable" as never },
    { ...request, months: 25 },
    { ...request, monthlySafetyMargin: "-1.00" },
  ])("refuses invalid requests before HTTP %#", (body) => {
    expect(() => toTrajectoryBody(body)).toThrow();
  });

  it("normalizes assumptions like the Web decimal input", () => {
    expect(normalizedAssumption("12,5")).toBe("12.50");
    expect(normalizedAssumption(" 1 250,05 ")).toBe("1250.05");
    expect(normalizedAssumption("0")).toBe("0.00");
    expect(normalizedAssumption("-1")).toBeNull();
    expect(normalizedAssumption("1,234")).toBeNull();
    expect(normalizedAssumption("100000000")).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import fixtures from "../fixtures/savingsTrajectories.json";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  parseSavingsTrajectories,
  savingsTrajectoryService,
} from "../../src/js/services/savingsTrajectoryService";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { post: vi.fn() },
}));
const request = {
  currency: "EUR",
  scenario: "standard",
  months: 24,
  selectedGoalId: 1,
  currentRemainingVariableExpense: "100.00",
  futureAdditionalVariableExpense: "700.00",
  monthlySafetyMargin: "100.00",
};
const response = () => structuredClone(fixtures.cases["standard-24-1-true"]);
const expected = fixtures.goals[0];
beforeEach(() => vi.resetAllMocks());
describe("authoritative savings trajectory contract", () => {
  it("reads the actual backend acceptance example without deriving money or dates", async () => {
    apiPrivate.post.mockResolvedValue({ data: { data: response() } });
    const parsed = await savingsTrajectoryService.simulate(
      { ...request, ownerId: 99 },
      expected
    );
    expect(apiPrivate.post).toHaveBeenCalledWith(
      "/savings-capacity/trajectories",
      request,
      { withCredentials: true }
    );
    expect(parsed.projections.reasonable.estimatedReachMonth).toBe("2027-05");
    expect(parsed.projections.maximum.estimatedReachMonth).toBe("2027-01");
    expect(parsed.projections.planned.estimatedReachMonth).toBe("2027-10");
    expect(
      parsed.projections.reasonable.current.remainingUnderAssumptions
    ).toBe("500.00");
    expect(
      parsed.projections.reasonable.months[0].selectedPossibleContribution
    ).toBe("650.00");
    expect(
      parsed.projections.reasonable.months[0].allocations[1]
        .reservedContribution
    ).toBe("150.00");
  });
  it("strips private extra fields", () => {
    const data = response();
    data.ownerId = 8;
    data.goals[0].ownerId = 8;
    data.projections.reasonable.months[0].secret = "private";
    expect(
      JSON.stringify(parseSavingsTrajectories(data, request, expected))
    ).not.toMatch(/ownerId|secret|private/);
  });
  it.each([
    (data) => {
      data.currency = "USD";
    },
    (data) => {
      data.scenario = "simulation";
    },
    (data) => {
      data.selectedGoalId = 2;
    },
    (data) => {
      data.assumptions.monthlySafetyMargin = "0.00";
    },
    (data) => {
      data.projections.reasonable.months.pop();
    },
    (data) => {
      data.projections.maximum.points[1].month = "2026-12";
    },
    (data) => {
      data.projections.planned.points[0].savedAmount = "0.00";
    },
    (data) => {
      data.projections.maximum.months[0].allocations[1].goalId = 1;
    },
    (data) => {
      data.projections.reasonable.months[0].capacityBeforeGoals =
        "90071992547410.00";
    },
    (data) => {
      data.projections.reasonable.points[1].fundable = false;
    },
    (data) => {
      data.projections.maximum.estimatedReachMonth = "2099-01";
    },
    (data) => {
      data.projections.reasonable.reachReason = "ON_TRACK";
    },
  ])("rejects inconsistent or unsafe snapshots %#", (change) => {
    const data = response();
    change(data);
    expect(() => parseSavingsTrajectories(data, request, expected)).toThrow();
  });
  it("detects a concurrently changed goal rather than mixing it with the gauge", () => {
    const data = response();
    data.goals[0].savedAmount = "2000.00";
    expect(() => parseSavingsTrajectories(data, request, expected)).toThrow(
      "Goal snapshot changed"
    );
  });
  it("keeps signed deficits and null reach estimates", () => {
    const data = response(),
      projection = data.projections.reasonable;
    projection.reachReason = "BUDGET_DEFICIT";
    projection.estimatedReachMonth = null;
    projection.months[0].freeSupplement = "-100.00";
    expect(
      parseSavingsTrajectories(data, request, expected).projections.reasonable
        .months[0].freeSupplement
    ).toBe("-100.00");
  });
  it.each([
    { ...request, scenario: "reasonable" },
    { ...request, months: 25 },
    { ...request, monthlySafetyMargin: "-1.00" },
  ])("refuses invalid requests before HTTP", async (body) => {
    await expect(
      savingsTrajectoryService.simulate(body, expected)
    ).rejects.toThrow();
    expect(apiPrivate.post).not.toHaveBeenCalled();
  });
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
      parseSavingsTrajectories(edge.data, query, edge.goal).projections
        .reasonable.reachReason
    ).toBe(edge.data.projections.reasonable.reachReason);
  }
);

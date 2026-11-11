import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { parseFinancialGoal } from "@/src/features/goals/domain/financialGoal";
import { HttpSavingsTrajectoryGateway } from "@/src/features/goals/infrastructure/HttpSavingsTrajectoryGateway";

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
const request = {
  currency: "EUR",
  scenario: "standard" as const,
  months: 24,
  selectedGoalId: 1,
  currentRemainingVariableExpense: "100.00",
  futureAdditionalVariableExpense: "700.00",
  monthlySafetyMargin: "100.00",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("HttpSavingsTrajectoryGateway (#285)", () => {
  it("posts the Web body and parses the server snapshot", async () => {
    const http = {
      request: vi.fn(async () =>
        json({ data: fixtures.cases["standard-24-1-true"] }),
      ),
    };
    const result = await new HttpSavingsTrajectoryGateway(http).simulate(
      request,
      parseFinancialGoal(fixtures.goals[0]),
    );
    expect(http.request).toHaveBeenCalledWith(
      "/savings-capacity/trajectories",
      expect.objectContaining({ method: "POST" }),
    );
    const init = (http.request.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual(request);
    expect(result.projections.maximum.estimatedReachMonth).toBe("2027-01");
  });

  it("refuses an invalid request before HTTP and reports server errors", async () => {
    const http = { request: vi.fn(async () => json({}, 503)) };
    const gateway = new HttpSavingsTrajectoryGateway(http);
    await expect(
      gateway.simulate({ ...request, months: 25 }),
    ).rejects.toThrow();
    expect(http.request).not.toHaveBeenCalled();
    await expect(gateway.simulate(request)).rejects.toThrow(
      "Savings trajectory request failed",
    );
  });
});

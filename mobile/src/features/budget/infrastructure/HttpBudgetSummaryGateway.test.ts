import { describe, expect, it, vi } from "vitest";

import {
  BudgetSummaryRequestError,
  HttpBudgetSummaryGateway,
} from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";

const summary = {
  month: "2026-10",
  currency: "EUR",
  status: "OPEN",
  carryIn: "0.00",
  carryFromMonth: null,
  monthResult: "100.00",
  realRemaining: "100.00",
  remainingDays: 21,
  realDailyAllowance: "4.76",
  forecast: null,
  days: [],
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("HttpBudgetSummaryGateway", () => {
  it("requests the month summary in euros and parses it", async () => {
    const request = vi.fn().mockResolvedValue(json(200, { data: summary }));
    const gateway = new HttpBudgetSummaryGateway({ request });

    await expect(gateway.getSummary("2026-10")).resolves.toMatchObject({
      realRemaining: "100.00",
      forecast: null,
    });
    expect(request).toHaveBeenCalledWith(
      "/budget-periods/2026-10/summary?currency=EUR",
    );
  });

  it("reports the HTTP status of a failed request", async () => {
    const request = vi.fn().mockResolvedValue(json(503, {}));
    const gateway = new HttpBudgetSummaryGateway({ request });

    await expect(gateway.getSummary("2026-10")).rejects.toEqual(
      new BudgetSummaryRequestError(503),
    );
  });

  it("rejects an invalid payload", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(json(200, { data: { ...summary, month: "x" } }));
    await expect(
      new HttpBudgetSummaryGateway({ request }).getSummary("2026-10"),
    ).rejects.toThrow("Invalid budget summary");
  });
});

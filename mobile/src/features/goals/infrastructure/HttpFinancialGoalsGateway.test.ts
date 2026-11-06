import { describe, expect, it, vi } from "vitest";

import {
  GOALS_PAGE_LIMIT,
  GoalRequestError,
  HttpFinancialGoalsGateway,
} from "@/src/features/goals/infrastructure/HttpFinancialGoalsGateway";

const goal = {
  id: 3,
  title: "Vélo",
  targetAmount: "1000.00",
  savedAmount: "250.00",
  monthlyContribution: "150.00",
  currency: "EUR",
  targetDate: null,
  forecast: {
    referenceMonth: "2026-10",
    status: "NO_DEADLINE",
    remainingAmount: "750.00",
    contributionsNeeded: 5,
    estimatedReachMonth: "2027-03",
    requiredMonthlyContribution: null,
  },
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const page = (data: unknown[], nextCursor: string | null = null) =>
  json({
    data,
    meta: { limit: GOALS_PAGE_LIMIT, hasNext: nextCursor != null, nextCursor },
  });
const draft = {
  title: "Vélo",
  targetAmount: "1000",
  savedAmount: "250",
  monthlyContribution: "150",
  targetDate: null,
};

describe("HttpFinancialGoalsGateway (#226)", () => {
  it("loads every page and rejects a repeated cursor", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(page([goal], "next+/="))
      .mockResolvedValueOnce(page([{ ...goal, id: 4 }]));
    await expect(
      new HttpFinancialGoalsGateway({ request }).listAllGoals(),
    ).resolves.toHaveLength(2);
    expect(request).toHaveBeenNthCalledWith(
      2,
      `/goals?limit=${GOALS_PAGE_LIMIT}&cursor=next%2B%2F%3D`,
    );

    const repeated = vi
      .fn()
      .mockImplementation(() => Promise.resolve(page([], "same")));
    await expect(
      new HttpFinancialGoalsGateway({ request: repeated }).listAllGoals(),
    ).rejects.toThrow("Repeated goal cursor");
  });

  it("creates, updates and deletes with the Web contract", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json({ data: goal }, 201))
      .mockResolvedValueOnce(json({ data: { ...goal, title: "Voyage" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = new HttpFinancialGoalsGateway({ request });

    await expect(gateway.createGoal(draft)).resolves.toMatchObject({ id: 3 });
    expect(request).toHaveBeenNthCalledWith(1, "/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Vélo",
        targetAmount: "1000.00",
        savedAmount: "250.00",
        monthlyContribution: "150.00",
        currency: "EUR",
        targetDate: null,
      }),
    });
    await expect(gateway.updateGoal(3, draft)).resolves.toMatchObject({
      title: "Voyage",
    });
    expect(request.mock.calls[1][0]).toBe("/goals/3");
    expect(request.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    await expect(gateway.deleteGoal(3)).resolves.toBeUndefined();
    expect(request).toHaveBeenNthCalledWith(3, "/goals/3", {
      method: "DELETE",
    });
  });

  it("exposes the HTTP status of a failed request", async () => {
    const request = vi.fn().mockResolvedValue(json({}, 422));
    await expect(
      new HttpFinancialGoalsGateway({ request }).createGoal(draft),
    ).rejects.toEqual(new GoalRequestError(422));
  });
});

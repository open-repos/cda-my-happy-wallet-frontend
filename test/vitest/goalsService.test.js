import { beforeEach, describe, expect, it, vi } from "vitest";
import { goalsService, parseGoal } from "../../src/js/services/goalsService";
import { apiPrivate } from "../../src/utils/axiosHelper";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn() },
}));

const goal = {
  id: 3,
  title: "Vélo",
  targetAmount: "1200.00",
  savedAmount: "300.00",
  monthlyContribution: "150.00",
  currency: "EUR",
  targetDate: null,
  forecast: { status: "NO_DEADLINE" },
};

const page = (
  data,
  meta = { limit: 100, hasNext: false, nextCursor: null }
) => ({
  data: { data, meta },
});

beforeEach(() => vi.clearAllMocks());

describe("goalsService", () => {
  it("keeps only the fields displayed by the home page", () => {
    expect(parseGoal(goal)).toEqual({
      id: 3,
      title: "Vélo",
      targetAmount: "1200.00",
      savedAmount: "300.00",
      currency: "EUR",
    });
  });

  it.each([
    { ...goal, id: 0 },
    { ...goal, targetAmount: "-1.00" },
    { ...goal, savedAmount: 300 },
    { ...goal, currency: "eur" },
  ])("rejects an invalid goal %#", (invalid) => {
    expect(() => parseGoal(invalid)).toThrow("Invalid goal response");
  });

  it("loads every page of goals", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(
        page([goal], { limit: 100, hasNext: true, nextCursor: "next" })
      )
      .mockResolvedValueOnce(page([{ ...goal, id: 4 }]));

    const goals = await goalsService.listAllGoals();

    expect(goals.map((item) => item.id)).toEqual([3, 4]);
    expect(apiPrivate.get).toHaveBeenLastCalledWith("/goals", {
      params: { limit: 100, cursor: "next" },
      withCredentials: true,
    });
  });

  it("rejects an invalid collection and a repeated cursor", async () => {
    apiPrivate.get.mockResolvedValueOnce({ data: { data: [] } });
    await expect(goalsService.listAllGoals()).rejects.toThrow(
      "Invalid goal collection response"
    );

    apiPrivate.get.mockResolvedValue(
      page([goal], { limit: 100, hasNext: true, nextCursor: "loop" })
    );
    await expect(goalsService.listAllGoals()).rejects.toThrow(
      "Repeated goal cursor"
    );
  });
});

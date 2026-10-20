import { beforeEach, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  monthlyEventsService,
  parseMonthlyEvent,
} from "../../src/js/services/monthlyEventsService";
import { budgetService } from "../../src/js/services/budgetService";
import { budgetForecastService } from "../../src/js/services/budgetForecastService";
import { savingsCapacityService } from "../../src/js/services/savingsCapacityService";
import { budgetForecast, forecastMonth } from "./fixtures/budgetForecast";
import { savingsCapacity } from "./fixtures/savingsCapacity";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const potential = (overrides = {}) => ({
  id: 8,
  title: "Voyage",
  amount: "300.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: "2026-10-24",
  recurrence: "AUCUNE",
  endDate: null,
  status: "POTENTIEL",
  ...overrides,
});
const page = (data) => ({
  data: { data, meta: { limit: 100, hasNext: false, nextCursor: null } },
});
beforeEach(() => vi.resetAllMocks());

it("loads potentials through an explicit status filter, including all pages", async () => {
  apiPrivate.get
    .mockResolvedValueOnce({
      data: {
        data: [potential()],
        meta: { limit: 100, hasNext: true, nextCursor: "potential-next" },
      },
    })
    .mockResolvedValueOnce(page([potential({ id: 9 })]));
  expect(
    (await monthlyEventsService.listPotentialEvents()).map((x) => x.id)
  ).toEqual([8, 9]);
  expect(apiPrivate.get).toHaveBeenLastCalledWith("/events", {
    params: { status: "POTENTIEL", limit: 100, cursor: "potential-next" },
    withCredentials: true,
  });
});
it("preserves known status and rejects unknown status or a confirmed rule in the potential list", async () => {
  expect(parseMonthlyEvent(potential({ ownerId: 99 }))).toEqual(potential());
  expect(() => parseMonthlyEvent(potential({ status: "MAYBE" }))).toThrow();
  apiPrivate.get.mockResolvedValue(page([potential({ status: "CONFIRME" })]));
  await expect(monthlyEventsService.listPotentialEvents()).rejects.toThrow();
});
it("whitelists potential writes and uses the explicit confirmation route", async () => {
  apiPrivate.post
    .mockResolvedValueOnce({ data: { data: potential() } })
    .mockResolvedValueOnce({
      data: { data: potential({ status: "CONFIRME" }) },
    });
  const { id, status, ...body } = potential();
  await monthlyEventsService.createPotentialEvent({
    ...potential(),
    ownerId: 99,
    status: "CONFIRME",
  });
  expect(apiPrivate.post).toHaveBeenNthCalledWith(
    1,
    "/events",
    { ...body, status: "POTENTIEL" },
    { withCredentials: true }
  );
  apiPrivate.put.mockResolvedValue({ data: { data: potential() } });
  await monthlyEventsService.updateEvent(id, { ...potential(), ownerId: 99 });
  expect(apiPrivate.put).toHaveBeenCalledWith("/events/8", body, {
    withCredentials: true,
  });
  expect((await monthlyEventsService.confirmPotentialEvent(id)).status).toBe(
    "CONFIRME"
  );
  expect(apiPrivate.post).toHaveBeenNthCalledWith(
    2,
    "/events/8/confirm",
    undefined,
    { withCredentials: true }
  );
  await monthlyEventsService.clearPotentialEvents();
  expect(apiPrivate.delete).toHaveBeenCalledWith("/simulation/events", {
    withCredentials: true,
  });
});
it("uses a scenario only on explicitly selected forecast and capacity reads", async () => {
  apiPrivate.get.mockResolvedValue({ data: { data: budgetForecast() } });
  await budgetForecastService.forecast({
    from: "2026-10",
    months: 2,
    currency: "EUR",
    scenario: "simulation",
  });
  expect(apiPrivate.get).toHaveBeenLastCalledWith("/budget-forecast", {
    params: {
      from: "2026-10",
      months: 2,
      currency: "EUR",
      scenario: "simulation",
    },
    withCredentials: true,
  });
  apiPrivate.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        data:
          url === "/savings-capacity"
            ? savingsCapacity()
            : budgetForecast({ months: [forecastMonth()] }),
      },
    })
  );
  await savingsCapacityService.overview({
    from: "2026-10",
    currency: "EUR",
    scenario: "simulation",
  });
  expect(apiPrivate.get).toHaveBeenCalledWith("/savings-capacity", {
    params: {
      from: "2026-10",
      months: 1,
      currency: "EUR",
      scenario: "simulation",
    },
    withCredentials: true,
  });
  apiPrivate.get.mockRejectedValue(new Error("transport"));
  await expect(
    budgetService.getSummary("2026-10", "EUR", "simulation")
  ).rejects.toThrow();
  expect(apiPrivate.get).toHaveBeenLastCalledWith(
    "/budget-periods/2026-10/summary",
    {
      params: { currency: "EUR", scenario: "simulation" },
      withCredentials: true,
    }
  );
  await expect(
    monthlyEventsService.listOccurrences("2026-10", "simulation")
  ).rejects.toThrow();
  expect(apiPrivate.get).toHaveBeenLastCalledWith("/event-occurrences", {
    params: { month: "2026-10", scenario: "simulation", limit: 100 },
    withCredentials: true,
  });
  await expect(
    budgetForecastService.forecast({
      from: "2026-10",
      months: 2,
      currency: "EUR",
      scenario: "standard",
    })
  ).rejects.toThrow();
  expect(apiPrivate.get).toHaveBeenLastCalledWith("/budget-forecast", {
    params: { from: "2026-10", months: 2, currency: "EUR" },
    withCredentials: true,
  });
});

vi.mock("../../src/js/services/calendarResolutionsService", () => ({
  listCalendarResolutions: vi.fn(async () => []),
}));
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/js/components/Simulation/SimulationContext";
import { useSimulationComparison } from "../../src/js/hooks/useSimulationComparison";
import { usePotentialEvents } from "../../src/js/hooks/usePotentialEvents";
import { useBudgetForecast } from "../../src/js/hooks/useBudgetForecast";
import { useBudgetCalendar } from "../../src/js/hooks/useBudgetCalendar";
import { budgetService } from "../../src/js/services/budgetService";
import { budgetForecastService } from "../../src/js/services/budgetForecastService";
import { monthlyEventsService } from "../../src/js/services/monthlyEventsService";
import { budgetForecast, forecastMonth } from "./fixtures/budgetForecast";
vi.mock("../../src/js/services/budgetForecastService", () => ({
  budgetForecastService: { forecast: vi.fn() },
}));
vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: {
    listPotentialEvents: vi.fn(),
    listOccurrences: vi.fn(async () => []),
  },
}));
vi.mock("../../src/js/services/budgetService", () => ({
  budgetService: { getSummary: vi.fn(), listPending: vi.fn() },
  budgetErrorCode: vi.fn(),
}));
vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listAllCategories: vi.fn().mockResolvedValue([]),
    listAllOperations: vi.fn(async () => []),
    listOperations: vi.fn().mockResolvedValue({ data: [], meta: {} }),
  },
}));
let controller;
const Capture = () => {
  controller = useSimulation();
  return null;
};
const wrapper = ({ children }) => (
  <SimulationProvider>
    <Capture />
    {children}
  </SimulationProvider>
);
beforeEach(() => vi.resetAllMocks());
const projection = (value) =>
  budgetForecast({ months: [forecastMonth({ forecastRemaining: value })] });

it("ignores a retry captured before the scenario changed", async () => {
  budgetService.listPending.mockResolvedValue([]);
  budgetService.getSummary.mockImplementation((_month, _currency, scenario) =>
    Promise.resolve({
      forecastRemaining: scenario === "simulation" ? "400.00" : "700.00",
    })
  );
  const { result } = renderHook(() => useBudgetCalendar("2026-10", null), {
    wrapper,
  });
  await waitFor(() => expect(result.current.summaryStatus).toBe("success"));
  const previousRetry = result.current.retry;
  act(() => controller.setEnabled(true));
  await waitFor(() =>
    expect(result.current.summary?.forecastRemaining).toBe("400.00")
  );
  await act(async () => previousRetry());
  expect(result.current.summaryStatus).toBe("success");
  expect(result.current.summary.forecastRemaining).toBe("400.00");
});

it("hides the previous scenario immediately while a replacement forecast loads", async () => {
  budgetForecastService.forecast.mockImplementation((query) =>
    Promise.resolve(
      projection(query.scenario === "simulation" ? "400.00" : "700.00")
    )
  );
  const { result } = renderHook(
    () => useBudgetForecast({ from: "2026-10", months: 1, currency: "EUR" }),
    { wrapper }
  );
  await waitFor(() => expect(result.current.status).toBe("success"));
  act(() => controller.setEnabled(true));
  expect(result.current.data).toBeNull();
  await waitFor(() =>
    expect(result.current.data.months[0].forecastRemaining).toBe("400.00")
  );
  act(() => controller.setEnabled(false));
  expect(result.current.data).toBeNull();
  await waitFor(() =>
    expect(result.current.data.months[0].forecastRemaining).toBe("700.00")
  );
});

it("never fetches a simulation comparison while standard mode is displayed", () => {
  const { result } = renderHook(() => useSimulationComparison("2026-10"), {
    wrapper,
  });
  expect(result.current.status).toBe("idle");
  expect(budgetForecastService.forecast).not.toHaveBeenCalled();
});
it("compares matching snapshots and hides them immediately after disabling simulation", async () => {
  budgetForecastService.forecast.mockImplementation((query) =>
    Promise.resolve(
      projection(query.scenario === "simulation" ? "400.00" : "700.00")
    )
  );
  const { result } = renderHook(() => useSimulationComparison("2026-10"), {
    wrapper,
  });
  act(() => controller.setEnabled(true));
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.standard.months[0].forecastRemaining).toBe("700.00");
  expect(result.current.simulation.months[0].forecastRemaining).toBe("400.00");
  act(() => controller.setEnabled(false));
  expect(result.current.status).toBe("idle");
  expect(result.current.simulation).toBeNull();
});
it("rejects mismatched reference dates instead of presenting a false comparison", async () => {
  budgetForecastService.forecast.mockImplementation((query) =>
    Promise.resolve({
      ...projection("400.00"),
      referenceDate:
        query.scenario === "simulation" ? "2026-10-20" : "2026-10-19",
    })
  );
  const { result } = renderHook(() => useSimulationComparison("2026-10"), {
    wrapper,
  });
  act(() => controller.setEnabled(true));
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current.simulation).toBeNull();
});
it("ignores an older potential list after an action invalidates the screen", async () => {
  let old;
  monthlyEventsService.listPotentialEvents
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          old = resolve;
        })
    )
    .mockResolvedValueOnce([]);
  const { result } = renderHook(() => usePotentialEvents(), { wrapper });
  act(() => controller.invalidate());
  await waitFor(() => expect(result.current.status).toBe("success"));
  await act(async () => old([{ id: 8, title: "obsolete" }]));
  expect(result.current.events).toEqual([]);
});

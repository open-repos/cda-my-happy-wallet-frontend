import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBudgetForecast } from "../../src/js/hooks/useBudgetForecast";
import { budgetForecastService } from "../../src/js/services/budgetForecastService";
import { budgetForecast } from "./fixtures/budgetForecast";

vi.mock("../../src/js/services/budgetForecastService", () => ({
  budgetForecastService: { forecast: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());
const query = { from: "2026-10", months: 2, currency: "EUR" };

describe("budget forecast loading", () => {
  it("ignores an older window when it resolves after the current one", async () => {
    let finishOld;
    budgetForecastService.forecast
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          })
      )
      .mockResolvedValueOnce(budgetForecast({ from: "2026-11" }));
    const { result, rerender } = renderHook(
      ({ from }) => useBudgetForecast({ ...query, from }),
      { initialProps: { from: "2026-10" } }
    );
    rerender({ from: "2026-11" });
    await waitFor(() => expect(result.current.status).toBe("success"));
    await act(async () => finishOld(budgetForecast()));
    expect(result.current.data.from).toBe("2026-11");
  });

  it("supports retry and distinguishes empty data from a request failure", async () => {
    budgetForecastService.forecast
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(budgetForecast({ months: [] }));
    const { result } = renderHook(() => useBudgetForecast(query));
    await waitFor(() => expect(result.current.status).toBe("error"));
    await act(async () => result.current.reload());
    expect(result.current.status).toBe("empty");
  });

  it("does not request an invalid window", async () => {
    const { result } = renderHook(() =>
      useBudgetForecast(query, "Choisissez un mois valide.")
    );
    await waitFor(() => expect(result.current.status).toBe("invalid"));
    expect(budgetForecastService.forecast).not.toHaveBeenCalled();
  });
});

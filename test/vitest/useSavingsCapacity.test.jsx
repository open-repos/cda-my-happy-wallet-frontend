import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useSavingsCapacity } from "../../src/js/hooks/useSavingsCapacity";
import { savingsCapacityService } from "../../src/js/services/savingsCapacityService";
import { savingsOverview } from "./fixtures/savingsCapacity";
vi.mock("../../src/js/services/savingsCapacityService", () => ({
  savingsCapacityService: { overview: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());

it("reloads after goal edits and ignores older data", async () => {
  let old;
  savingsCapacityService.overview
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          old = resolve;
        })
    )
    .mockResolvedValueOnce(
      savingsOverview({ totalPlannedMonthlyContribution: "180.00" })
    );
  const { result, rerender } = renderHook(
    ({ revision }) => useSavingsCapacity("2026-10", revision),
    { initialProps: { revision: "before" } }
  );
  rerender({ revision: "after" });
  await waitFor(() => expect(result.current.status).toBe("success"));
  await act(async () => old(savingsOverview()));
  expect(result.current.data.totalPlannedMonthlyContribution).toBe("180.00");
});

it("offers retry after a failed or incoherent read", async () => {
  savingsCapacityService.overview
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(savingsOverview());
  const { result } = renderHook(() => useSavingsCapacity("2026-10"));
  await waitFor(() => expect(result.current.status).toBe("error"));
  await act(async () => result.current.reload());
  expect(result.current.status).toBe("success");
});

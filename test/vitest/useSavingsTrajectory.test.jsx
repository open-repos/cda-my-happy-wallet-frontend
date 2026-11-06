import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import fixtures from "../fixtures/savingsTrajectories.json";
import { useSavingsTrajectory } from "../../src/js/hooks/useSavingsTrajectory";
import { savingsTrajectoryService } from "../../src/js/services/savingsTrajectoryService";
const context = vi.hoisted(() => ({ scenario: "standard", revision: 0 }));
vi.mock("../../src/js/components/Simulation/SimulationContext", () => ({
  useSimulation: () => context,
}));
vi.mock("../../src/js/services/savingsTrajectoryService", () => ({
  savingsTrajectoryService: { simulate: vi.fn() },
}));
const assumptions = {
  currentRemainingVariableExpense: "0.00",
  futureAdditionalVariableExpense: "0.00",
  monthlySafetyMargin: "0.00",
};
beforeEach(() => {
  vi.resetAllMocks();
  context.scenario = "standard";
  context.revision = 0;
});
it("discards late responses from a previous goal", async () => {
  let resolve;
  savingsTrajectoryService.simulate
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    )
    .mockResolvedValueOnce({ selectedGoalId: 2 });
  const { result, rerender } = renderHook(
    ({ goal }) => useSavingsTrajectory(goal, 24, assumptions),
    { initialProps: { goal: fixtures.goals[0] } }
  );
  rerender({ goal: fixtures.goals[1] });
  await waitFor(() => expect(result.current.data?.selectedGoalId).toBe(2));
  await act(async () => resolve({ selectedGoalId: 1 }));
  expect(result.current.data.selectedGoalId).toBe(2);
});
it("refetches for scenario and financial revision, preserving null data while loading", async () => {
  savingsTrajectoryService.simulate.mockResolvedValue({ selectedGoalId: 1 });
  const { result, rerender } = renderHook(() =>
    useSavingsTrajectory(fixtures.goals[0], 24, assumptions)
  );
  await waitFor(() => expect(result.current.status).toBe("success"));
  context.scenario = "simulation";
  rerender();
  await waitFor(() =>
    expect(savingsTrajectoryService.simulate).toHaveBeenLastCalledWith(
      expect.objectContaining({ scenario: "simulation" }),
      fixtures.goals[0]
    )
  );
  context.revision++;
  rerender();
  await waitFor(() =>
    expect(savingsTrajectoryService.simulate).toHaveBeenCalledTimes(3)
  );
});
it("distinguishes concurrent edits and permits retry without changing assumptions", async () => {
  savingsTrajectoryService.simulate
    .mockRejectedValueOnce(
      Object.assign(new Error("stale"), { code: "STALE_GOAL" })
    )
    .mockResolvedValueOnce({ selectedGoalId: 1 });
  const { result } = renderHook(() =>
    useSavingsTrajectory(fixtures.goals[0], 24, assumptions)
  );
  await waitFor(() => expect(result.current.status).toBe("conflict"));
  await act(async () => result.current.reload());
  expect(result.current.status).toBe("success");
  expect(savingsTrajectoryService.simulate.mock.calls[1][0]).toMatchObject(
    assumptions
  );
});

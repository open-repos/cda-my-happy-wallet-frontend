import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFinancialGoals } from "../../src/js/hooks/useFinancialGoals";
import { goalsService } from "../../src/js/services/goalsService";

vi.mock("../../src/js/services/goalsService", () => ({
  goalsService: {
    listAllGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));

let api;
const Probe = () => {
  api = useFinancialGoals();
  return (
    <p data-testid="probe">
      {api.status}|{api.mutationStatus}|{api.goals.length}|{api.message}
    </p>
  );
};
const text = () => screen.getByTestId("probe").textContent;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useFinancialGoals", () => {
  it("loads goals and reloads them after a successful command", async () => {
    goalsService.listAllGoals
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1 }]);
    goalsService.createGoal.mockResolvedValue({ id: 1 });
    render(<Probe />);
    await waitFor(() => expect(text()).toBe("success|idle|0|"));

    let succeeded;
    await act(async () => {
      succeeded = await api.createGoal({ title: "Vélo" });
    });

    expect(succeeded).toBe(true);
    expect(text()).toBe("success|success|1|Objectif ajouté.");
  });

  it("explains a refused value and a load failure", async () => {
    goalsService.listAllGoals.mockResolvedValueOnce([]);
    goalsService.updateGoal.mockRejectedValue({ response: { status: 422 } });
    render(<Probe />);
    await waitFor(() => expect(text()).toBe("success|idle|0|"));

    await act(async () => {
      await api.updateGoal(1, {});
    });
    expect(text()).toContain("error|0|Certaines valeurs sont refusées");

    goalsService.listAllGoals.mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      await api.retry();
    });
    expect(text()).toContain(
      "error|error|0|Impossible de charger vos objectifs"
    );
  });

  it("clears a load error once a retry succeeds", async () => {
    goalsService.listAllGoals
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([{ id: 1 }]);
    render(<Probe />);
    await waitFor(() => expect(text()).toContain("error|idle|0|Impossible"));

    await act(async () => {
      await api.retry();
    });

    expect(text()).toBe("success|idle|1|");
  });

  it("explains a failed deletion", async () => {
    goalsService.listAllGoals.mockResolvedValueOnce([{ id: 1 }]);
    goalsService.deleteGoal.mockRejectedValue(new Error("offline"));
    render(<Probe />);
    await waitFor(() => expect(text()).toBe("success|idle|1|"));

    await act(async () => {
      await api.deleteGoal(1);
    });

    expect(text()).toContain("L’objectif n’a pas pu être supprimé.");
  });
});

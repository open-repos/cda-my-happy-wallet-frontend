import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentParisMonth,
  useHomeBudget,
} from "../../src/js/hooks/useHomeBudget";
import { budgetService } from "../../src/js/services/budgetService";
import { goalsService } from "../../src/js/services/goalsService";
import { oneOffOperationsService } from "../../src/js/services/oneOffOperationsService";

vi.mock("../../src/js/services/budgetService", () => ({
  budgetService: { getSummary: vi.fn() },
}));
vi.mock("../../src/js/services/goalsService", () => ({
  goalsService: { listAllGoals: vi.fn() },
}));
vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listAllOperations: vi.fn(),
    listAllCategories: vi.fn(),
  },
}));

const Probe = ({ month }) => {
  const { summary, expenses, goals } = useHomeBudget(month);
  return (
    <p data-testid="probe">
      {[summary, expenses, goals].map((section) => section.status).join(",")}
      {expenses.data && `|${expenses.data.map((row) => row.amount).join(",")}`}
    </p>
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useHomeBudget", () => {
  it("loads the current month and keeps a failed section isolated", async () => {
    budgetService.getSummary.mockResolvedValue({ realRemaining: "10.00" });
    oneOffOperationsService.listAllOperations.mockResolvedValue([
      { type: "DEPENSE", amount: "12.30", categoryId: 4, currency: "EUR" },
    ]);
    oneOffOperationsService.listAllCategories.mockResolvedValue([
      { id: 4, name: "Alimentation", color: null },
    ]);
    goalsService.listAllGoals.mockRejectedValue(new Error("offline"));

    render(<Probe month="2026-02" />);

    await waitFor(() =>
      expect(screen.getByTestId("probe").textContent).toBe(
        "success,success,error|12.30"
      )
    );
    expect(budgetService.getSummary).toHaveBeenCalledWith("2026-02", "EUR");
    expect(oneOffOperationsService.listAllOperations).toHaveBeenCalledWith({
      from: "2026-02-01",
      to: "2026-02-28",
      currency: "EUR",
    });
  });

  it("ignores a late failure once a newer retry succeeded", async () => {
    let rejectFirst;
    budgetService.getSummary
      .mockImplementationOnce(
        () => new Promise((_, reject) => (rejectFirst = reject))
      )
      .mockResolvedValueOnce({ realRemaining: "10.00" });
    oneOffOperationsService.listAllOperations.mockResolvedValue([]);
    oneOffOperationsService.listAllCategories.mockResolvedValue([]);
    goalsService.listAllGoals.mockResolvedValue([]);
    const Retry = () => {
      const { summary } = useHomeBudget("2026-02");
      return (
        <button type="button" onClick={summary.reload}>
          {summary.status}
        </button>
      );
    };

    render(<Retry />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.getByRole("button").textContent).toBe("success")
    );
    await act(async () => rejectFirst(new Error("late")));

    expect(screen.getByRole("button").textContent).toBe("success");
  });

  it("computes the month on the Europe/Paris clock", () => {
    // 31 octobre 23:30 UTC correspond déjà au 1er novembre à Paris.
    expect(currentParisMonth(new Date("2026-10-31T23:30:00.000Z"))).toBe(
      "2026-11"
    );
  });
});

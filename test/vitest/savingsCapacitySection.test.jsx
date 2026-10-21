import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { SavingsCapacitySection } from "../../src/js/components/FinancialGoals/SavingsCapacitySection";
import { useSavingsCapacity } from "../../src/js/hooks/useSavingsCapacity";
import { savingsOverview, savingsGoal } from "./fixtures/savingsCapacity";
vi.mock("../../src/js/hooks/useSavingsCapacity", () => ({
  useSavingsCapacity: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const normalize = (text) => text.replace(/\s/g, " ");
const show = (data = savingsOverview(), props = {}) => {
  useSavingsCapacity.mockReturnValue({ status: "success", data });
  return render(
    <MemoryRouter>
      <SavingsCapacitySection {...props} />
    </MemoryRouter>
  );
};

it("shows backend effort, gap and month/week/day allowances with an edit entry point", () => {
  const adjust = vi.fn();
  show(undefined, { onAdjust: adjust });
  const region = screen.getByRole("region", { name: "Capacité d’épargne" });
  const text = normalize(region.textContent);
  for (const amount of [
    "150,00 €",
    "180,00 €",
    "30,00 €",
    "700,00 €",
    "376,92 €",
    "53,85 €",
  ])
    expect(text).toContain(amount);
  expect(within(region).getByText("Tenable")).toBeVisible();
  fireEvent.click(
    within(region).getByRole("button", {
      name: "Ajuster le versement pour Vélo",
    })
  );
  expect(adjust).toHaveBeenCalledWith(3, expect.anything());
});

it("links home effort directly to the matching goal editor", () => {
  show();
  expect(
    screen.getByRole("link", { name: "Ajuster le versement pour Vélo" })
  ).toHaveAttribute("href", "/objectifs-evenements?ajuster=3");
});

it("disables adjustment while the editable goal list is unavailable", () => {
  show(undefined, { onAdjust: vi.fn(), adjustDisabled: true });
  expect(
    screen.getByRole("button", { name: "Ajuster le versement pour Vélo" })
  ).toBeDisabled();
});

it.each([
  ["TENDU", "Tendu", /nul/],
  ["NON_TENABLE", "Non tenable", /négatif/],
  ["INDETERMINE", "Indéterminé", /échéance/],
])(
  "explains %s without inventing a threshold",
  (status, label, explanation) => {
    show(
      savingsOverview({
        totalRequiredMonthlyContribution: null,
        months: [
          {
            ...savingsOverview().months[0],
            sustainability: status,
            afterRequired: null,
          },
        ],
        goals: [
          savingsGoal({
            includedInTotals: false,
            requiredMonthlyContribution: null,
            monthlyContributionGap: null,
          }),
        ],
      })
    );
    expect(screen.getByText(label)).toBeVisible();
    expect(
      document.querySelector(".savings-capacity__indicator")
    ).toHaveTextContent(explanation);
    expect(screen.getAllByText("Non calculable").length).toBeGreaterThan(0);
    expect(screen.getByText(/Exclu des totaux/)).toBeVisible();
  }
);

it("keeps loading, failure with retry and no active goal explicit", () => {
  const reload = vi.fn();
  useSavingsCapacity.mockReturnValue({ status: "error", data: null, reload });
  const { rerender } = render(
    <MemoryRouter>
      <SavingsCapacitySection />
    </MemoryRouter>
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Réessayer la capacité d’épargne" })
  );
  expect(reload).toHaveBeenCalledOnce();
  useSavingsCapacity.mockReturnValue({ status: "loading", data: null });
  rerender(
    <MemoryRouter>
      <SavingsCapacitySection />
    </MemoryRouter>
  );
  expect(
    screen.getByText("Chargement de la capacité d’épargne…")
  ).toBeVisible();
  useSavingsCapacity.mockReturnValue({
    status: "success",
    data: savingsOverview({ goals: [] }),
  });
  rerender(
    <MemoryRouter>
      <SavingsCapacitySection />
    </MemoryRouter>
  );
  expect(
    screen.getByText("Aucun objectif actif à prendre en compte.")
  ).toBeVisible();
});

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import fixtures from "../fixtures/savingsTrajectories.json";
import { SavingsTrajectorySimulation } from "../../src/js/components/FinancialGoals/SavingsTrajectorySimulation";
import { useSavingsTrajectory } from "../../src/js/hooks/useSavingsTrajectory";
vi.mock("../../src/js/hooks/useSavingsTrajectory", () => ({
  useSavingsTrajectory: vi.fn(),
}));
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ label }) => <div role="img" aria-label={label} />,
}));
vi.mock("../../src/js/components/charts/useChartTokens", () => ({
  useChartTokens: () => ({
    text: "#123",
    muted: "#456",
    surface: "#fff",
    income: "#080",
    forecast: "#04f",
    grid: "#abc",
    reducedMotion: true,
  }),
}));
it.each([
  ["zero", "Sans versement dans cette période"],
  ["reached", "Objectif déjà atteint"],
  ["deficit", "Budget déficitaire dans cet horizon"],
])(
  "renders authoritative %s budgets without inventing a date",
  (kind, label) => {
    const edge = fixtures.edges[kind];
    useSavingsTrajectory.mockReturnValue({
      status: "success",
      data: edge.data,
      reload: vi.fn(),
    });
    render(
      <SavingsTrajectorySimulation goal={edge.goal} onRefresh={vi.fn()} />
    );
    expect(screen.getAllByText(label)).toHaveLength(3);
    if (kind === "deficit") {
      fireEvent.click(
        screen.getByText("Lire les trois trajectoires en tableau")
      );
      expect(screen.getAllByText(/non finançable/).length).toBeGreaterThan(1);
    }
    if (kind === "zero")
      expect(screen.getAllByText(/0,00\s*€/).length).toBeGreaterThan(1);
    if (kind === "reached")
      expect(screen.queryByText("Non atteint dans cet horizon")).toBeNull();
  }
);

afterEach(cleanup);

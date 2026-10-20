import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Home from "../../src/js/pages/Home";

const mocks = vi.hoisted(() => ({
  useOperationsFixes: vi.fn(),
}));
vi.mock(
  "../../src/js/components/FinancialGoals/SavingsCapacitySection",
  () => ({
    SavingsCapacitySection: () => <div>Capacity overview</div>,
  })
);

vi.mock("../../src/js/hooks/useOperationsFixes", () => ({
  useOperationsFixes: mocks.useOperationsFixes,
}));

vi.mock("../../src/js/components/HomeComponents/CaseOpFixeEmpty", () => ({
  default: () => <div>Empty operations state</div>,
}));

vi.mock("../../src/js/components/HomeComponents/CaseShowRaV", () => ({
  default: () => <div>Available reste à vivre</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Home", () => {
  it("renders the empty state when no fixed operation exists", () => {
    mocks.useOperationsFixes.mockReturnValue({ isEmptyOpFixe: true });

    render(<Home />, { wrapper: MemoryRouter });

    expect(screen.getByText("Empty operations state")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir les prochains mois" })
    ).toHaveAttribute("href", "/prochains-mois");
    expect(
      screen.queryByText("Available reste à vivre")
    ).not.toBeInTheDocument();
  });

  it("renders the reste à vivre state when operations exist", () => {
    mocks.useOperationsFixes.mockReturnValue({ isEmptyOpFixe: false });

    render(<Home />, { wrapper: MemoryRouter });

    expect(screen.getByText("Available reste à vivre")).toBeInTheDocument();
    expect(
      screen.queryByText("Empty operations state")
    ).not.toBeInTheDocument();
  });

  it("keeps the empty state while empty operations are loading", () => {
    mocks.useOperationsFixes.mockReturnValue({
      isEmptyOpFixe: true,
      isLoading: true,
    });

    render(<Home />, { wrapper: MemoryRouter });

    expect(screen.getByText("Empty operations state")).toBeInTheDocument();
  });
});

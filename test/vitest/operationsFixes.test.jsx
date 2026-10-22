import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperationsFixes from "../../src/js/pages/OperationsFixes";

vi.mock("../../src/js/components/OperationsFixes/CardOperationFixe", () => ({
  default: ({ name, typeOpFixe }) => (
    <div>
      {name}:{typeOpFixe}
    </div>
  ),
}));

vi.mock("../../src/js/components/OperationsFixes/FixedBudgetSummary", () => ({
  FixedBudgetSummary: () => <div>Budget serveur</div>,
}));

afterEach(cleanup);

describe("OperationsFixes", () => {
  it("composes charge, revenu and monthly RaV controls", () => {
    render(
      <MemoryRouter>
        <OperationsFixes />
      </MemoryRouter>
    );

    expect(screen.getByText("Mes charges:charges")).toBeInTheDocument();
    expect(screen.getByText("Mes revenus:revenus")).toBeInTheDocument();
    expect(screen.getByText("Budget serveur")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sauvegarder" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Revenir à la page d'accueil/i })
    ).toHaveAttribute("href", "/home");
  });
});

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import OperationsFixes from "../../src/js/pages/OperationsFixes";

vi.mock("../../src/js/components/OperationsFixes/FixedOperations", () => ({
  FixedOperations: () => <div>Liste commune et budget serveur</div>,
}));

afterEach(cleanup);

describe("OperationsFixes", () => {
  it("ouvre la gestion commune et conserve le retour à l’accueil", () => {
    render(
      <MemoryRouter>
        <OperationsFixes />
      </MemoryRouter>
    );

    expect(
      screen.getByText("Liste commune et budget serveur")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sauvegarder" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Revenir à la page d'accueil/i })
    ).toHaveAttribute("href", "/home");
  });
});

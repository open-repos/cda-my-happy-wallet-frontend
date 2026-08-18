import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ListeOperations from "../../src/js/pages/ListeOperations";
import { useOneOffOperations } from "../../src/js/hooks/useOneOffOperations";

vi.mock("../../src/js/hooks/useOneOffOperations", () => ({
  useOneOffOperations: vi.fn(),
}));

const actions = {
  retry: vi.fn(),
  loadMore: vi.fn(),
  createOperation: vi.fn().mockResolvedValue(true),
  updateOperation: vi.fn().mockResolvedValue(true),
  deleteOperation: vi.fn().mockResolvedValue(true),
};

const operation = {
  id: 7,
  title: "Courses",
  amount: "42.50",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: "2026-08-18",
  categoryId: 2,
};

const successfulState = {
  operations: [operation],
  categories: [{ id: 2, name: "Alimentation", color: "#55AA22" }],
  meta: { limit: 20, hasNext: true, nextCursor: "v1.next" },
  status: "success",
  pageStatus: "idle",
  mutationStatus: "idle",
  message: "",
  ...actions,
};

beforeEach(() => {
  Object.values(actions).forEach((action) => action.mockClear());
  useOneOffOperations.mockReturnValue(successfulState);
});
afterEach(cleanup);

describe("ListeOperations", () => {
  it("renders the populated Figma state and requests the next cursor page", () => {
    render(<ListeOperations />);
    expect(
      screen.getByRole("heading", {
        name: "Ensemble des opérations effectuées",
      })
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Courses/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Afficher la suite" }));
    expect(actions.loadMore).toHaveBeenCalledTimes(1);
  });

  it("renders loading, empty and recoverable error states", () => {
    useOneOffOperations.mockReturnValue({
      ...successfulState,
      status: "loading",
      operations: [],
    });
    const { rerender } = render(<ListeOperations />);
    expect(
      screen.getByRole("heading", { name: "Chargement des opérations…" })
    ).toBeInTheDocument();

    useOneOffOperations.mockReturnValue({
      ...successfulState,
      status: "success",
      operations: [],
      meta: { limit: 20, hasNext: false, nextCursor: null },
    });
    rerender(<ListeOperations />);
    expect(
      screen.getByRole("heading", { name: "Pas encore d’opération" })
    ).toBeInTheDocument();

    useOneOffOperations.mockReturnValue({
      ...successfulState,
      status: "error",
      operations: [],
      message: "Erreur générique",
    });
    rerender(<ListeOperations />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(actions.retry).toHaveBeenCalledTimes(1);
  });

  it("validates and submits a new operation without owner data", async () => {
    render(<ListeOperations />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une opération" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(screen.getByText(/titre doit contenir/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Titre/), {
      target: { value: "Prime" },
    });
    fireEvent.change(screen.getByLabelText(/^Montant/), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/^Date/), {
      target: { value: "2026-08-18" },
    });
    fireEvent.change(screen.getByLabelText(/^Catégorie/), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByLabelText("Entrée"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(actions.createOperation).not.toHaveBeenCalled();
    expect(screen.getByText(/montant positif/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Montant/), {
      target: { value: "125.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(actions.createOperation).toHaveBeenCalledWith({
      title: "Prime",
      amount: "125.50",
      currency: "EUR",
      kind: "ENTREE",
      operationDate: "2026-08-18",
      categoryId: 2,
    });
    expect(actions.createOperation.mock.calls[0][0]).not.toHaveProperty(
      "ownerId"
    );
  });

  it("opens editing and requires explicit deletion confirmation", () => {
    render(<ListeOperations />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier Courses" }));
    expect(
      screen.getByRole("heading", { name: "Modifier l’opération" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Titre")).toHaveValue("Courses");
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, supprimer" }));
    expect(actions.deleteOperation).toHaveBeenCalledWith(7);
  });
});

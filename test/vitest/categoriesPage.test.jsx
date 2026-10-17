import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Categories from "../../src/js/pages/Categories";
import { useCategories } from "../../src/js/hooks/useCategories";

vi.mock("../../src/js/hooks/useCategories", () => ({
  useCategories: vi.fn(),
}));

const actions = {
  retry: vi.fn(),
  saveCategory: vi.fn().mockResolvedValue({ ok: true, code: null }),
  deleteCategory: vi.fn().mockResolvedValue({ ok: true, code: null }),
};
const successfulState = {
  categories: [
    { id: 2, name: "Alimentation", color: "#075E3B" },
    { id: 5, name: "Divers", color: null },
  ],
  status: "success",
  mutationStatus: "idle",
  message: "",
  ...actions,
};
const renderPage = () =>
  render(
    <MemoryRouter>
      <Categories />
    </MemoryRouter>
  );

beforeEach(() => {
  Object.values(actions).forEach((action) => action.mockClear());
  actions.saveCategory.mockResolvedValue({ ok: true, code: null });
  actions.deleteCategory.mockResolvedValue({ ok: true, code: null });
  useCategories.mockReturnValue(successfulState);
});
afterEach(cleanup);

describe("Categories page", () => {
  it("lists every category with its color or a neutral dot", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Catégories d’opérations" })
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Vos catégories" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Divers")).toBeInTheDocument();
    expect(within(list).getByText("Sans couleur")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Modifier Alimentation" })
    ).toBeInTheDocument();
  });

  it("renders loading, empty and recoverable error states", () => {
    useCategories.mockReturnValue({ ...successfulState, status: "loading" });
    const { rerender } = renderPage();
    expect(screen.getByText("Chargement des catégories…")).toBeInTheDocument();

    useCategories.mockReturnValue({ ...successfulState, categories: [] });
    rerender(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );
    expect(screen.getByText("Pas encore de catégorie")).toBeInTheDocument();

    useCategories.mockReturnValue({
      ...successfulState,
      status: "error",
      message: "Impossible de charger vos catégories.",
    });
    rerender(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de charger vos catégories."
    );
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(actions.retry).toHaveBeenCalledTimes(1);
  });

  it("creates a category from the palette after validating its name", async () => {
    renderPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter une catégorie" })
    );
    const name = screen.getByLabelText("Nom");
    expect(name).toHaveFocus();

    fireEvent.change(name, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(
      await screen.findByText("Le nom doit contenir entre 2 et 50 caractères.")
    ).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    // Le focus revient au champ : son erreur est lue avec lui.
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription(
      "Le nom doit contenir entre 2 et 50 caractères."
    );
    expect(actions.saveCategory).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: "  Loisirs " } });
    fireEvent.click(screen.getByRole("radio", { name: "Bleu" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    });
    expect(actions.saveCategory).toHaveBeenCalledWith(null, {
      name: "Loisirs",
      color: "#275DAD",
    });
    expect(screen.queryByLabelText("Nom")).not.toBeInTheDocument();
  });

  it("keeps a custom color and shows a name conflict next to the field", async () => {
    actions.saveCategory.mockResolvedValue({
      ok: false,
      code: "CATEGORY_NAME_CONFLICT",
    });
    useCategories.mockReturnValue({
      ...successfulState,
      categories: [{ id: 7, name: "Voyage", color: "#123456" }],
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Modifier Voyage" }));

    expect(screen.getByRole("radio", { name: "Autre couleur" })).toBeChecked();
    expect(screen.getByLabelText("Couleur personnalisée")).toHaveValue(
      "#123456"
    );
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Alimentation" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    });

    expect(actions.saveCategory).toHaveBeenCalledWith(7, {
      name: "Alimentation",
      color: "#123456",
    });
    expect(screen.getByLabelText("Nom")).toHaveAccessibleDescription(
      "Une catégorie porte déjà ce nom."
    );
  });

  it("asks for confirmation before deleting and keeps the form when in use", async () => {
    actions.deleteCategory.mockResolvedValue({
      ok: false,
      code: "CATEGORY_IN_USE",
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Modifier Divers" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(actions.deleteCategory).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Oui, supprimer" }));
    });
    expect(actions.deleteCategory).toHaveBeenCalledWith(5);
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
  });

  it("closes the form when the edited category no longer exists", async () => {
    actions.saveCategory.mockResolvedValue({
      ok: false,
      code: "CATEGORY_NOT_FOUND",
    });
    renderPage();
    const edit = screen.getByRole("button", { name: "Modifier Divers" });
    edit.focus();
    fireEvent.click(edit);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    });
    expect(screen.queryByLabelText("Nom")).not.toBeInTheDocument();
    expect(edit).toHaveFocus();
  });

  it("closes the form with Escape and links back to the operations", () => {
    renderPage();
    const add = screen.getByRole("button", { name: "Ajouter une catégorie" });
    add.focus();
    fireEvent.click(add);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("Nom")).not.toBeInTheDocument();
    expect(add).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Voir les opérations" })
    ).toHaveAttribute("href", "/operations");
  });
});

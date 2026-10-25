import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OperationsFixes from "../../src/js/pages/OperationsFixes";
import reducer from "../../src/js/slices/operationsFixes/operationsFixesSlice";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { categoryService } from "../../src/js/services/categoryService";
import service from "../../src/js/services/operationsFixesService";
import { budgetService } from "../../src/js/services/budgetService";

vi.mock("../../src/js/services/operationsFixesService", () => ({
  default: {
    getAllCharges: vi.fn(),
    getAllRevenus: vi.fn(),
    postCharges: vi.fn(),
    putCharge: vi.fn(),
    deleteCharge: vi.fn(),
    postRevenus: vi.fn(),
    putRevenu: vi.fn(),
    deleteRevenu: vi.fn(),
  },
}));
vi.mock("../../src/js/services/categoryService", () => ({
  categoryService: { listAll: vi.fn() },
}));
vi.mock("../../src/js/services/budgetService", () => ({
  budgetService: { getSummary: vi.fn() },
}));
const annual = {
  idOperationFixe: 7,
  titre: "Assurance",
  montant: "120",
  devise: "EUR",
  periodicite: "ANNUELLE",
  pourcentagePersonnel: 50,
  montantPersonnel: "60.00",
  montantMensuelPersonnel: "5.01",
};
const salary = {
  idOperationFixe: 7,
  titre: "Salaire",
  montant: "2000",
  devise: "EUR",
};
let charges, incomes;
const show = () =>
  render(
    <Provider store={configureStore({ reducer: { operationsFixes: reducer } })}>
      <SimulationProvider>
        <MemoryRouter>
          <OperationsFixes />
        </MemoryRouter>
      </SimulationProvider>
    </Provider>
  );
const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const rows = () =>
  within(screen.getByRole("table", { name: "Charges et entrées fixes" }))
    .getAllByRole("row")
    .slice(1);
beforeEach(() => {
  categoryService.listAll.mockResolvedValue([
    {
      id: 10,
      name: "Assurances",
      icon: "solid:shield-halved",
      color: null,
      fixedKind: "CHARGE",
    },
    {
      id: 11,
      name: "Salaires",
      icon: "solid:money-bill-wave",
      color: null,
      fixedKind: "REVENU",
    },
    { id: 12, name: "Personnel", icon: null, color: null },
  ]);
  charges = [annual];
  incomes = [salary];
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  service.getAllCharges.mockImplementation(async () => ({
    data: { data: charges },
  }));
  service.getAllRevenus.mockImplementation(async () => ({
    data: { data: incomes },
  }));
  service.postRevenus.mockImplementation(async (body) => {
    incomes.push({ ...body, idOperationFixe: 8 });
  });
  service.putRevenu.mockImplementation(async (id, body) => {
    incomes = incomes.map((r) =>
      r.idOperationFixe === id ? { ...body, idOperationFixe: id } : r
    );
  });
  service.deleteRevenu.mockImplementation(async (id) => {
    incomes = incomes.filter((r) => r.idOperationFixe !== id);
  });
  budgetService.getSummary.mockResolvedValue({
    fixedIncome: "2100.00",
    fixedExpense: "5.01",
    base: "2094.99",
    realRemaining: "1834.42",
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("vue commune du budget fixe #265", () => {
  it("catégorise une nouvelle entrée sans transmettre les champs de charge", async () => {
    show();
    await screen.findByRole("button", { name: "Modifier Salaire" });
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter", exact: true })
    );
    fireEvent.click(screen.getByRole("radio", { name: "Entrée", exact: true }));
    fill("Titre de l’entrée", "Salaire complémentaire");
    fill("Montant reçu par mois", "100");
    const select = screen.getByRole("combobox", {
      name: "Catégorie",
      exact: true,
    });
    await waitFor(() => expect(select).toBeEnabled());
    chooseCategory(select, "Salaires");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’entrée" })
    );
    await waitFor(() =>
      expect(service.postRevenus).toHaveBeenCalledWith({
        titre: "Salaire complémentaire",
        montant: 100,
        devise: "EUR",
        categoryId: 11,
      })
    );
  });
  it("garde le brouillon et signale un refus de catégorie près du sélecteur", async () => {
    service.putCharge.mockRejectedValue({
      response: {
        data: { error: { details: { code: "INVALID_FIXED_CATEGORY" } } },
      },
    });
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier Assurance" })
    );
    const select = screen.getByRole("combobox", {
      name: "Catégorie",
      exact: true,
    });
    await waitFor(() => expect(select).toBeEnabled());
    chooseCategory(select, "Assurances");
    fill("Montant total par échéance", "240");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() => expect(select).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByLabelText("Montant total par échéance")).toHaveValue(
      "240"
    );
    chooseCategory(select, "Non catégorisé");
    expect(select).toHaveAttribute("aria-invalid", "false");
  });

  it("sélectionne une catégorie compatible dans la ligne et la retire explicitement", async () => {
    charges = [
      {
        ...annual,
        categoryId: 10,
        category: {
          id: 10,
          name: "Assurances",
          icon: "solid:shield-halved",
          color: null,
          fixedKind: "CHARGE",
        },
      },
    ];
    service.putCharge.mockResolvedValue({ data: { success: true } });
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier Assurance" })
    );
    const select = screen.getByRole("combobox", { name: "Catégorie" });
    await waitFor(() => expect(select).toBeEnabled());
    expect(select).toHaveTextContent("Assurances");
    fireEvent.click(select);
    expect(
      within(screen.getByRole("listbox")).queryByRole("option", {
        name: "Salaires",
      })
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("listbox")).getByRole("option", {
        name: "Personnel",
      })
    ).toBeInTheDocument();
    chooseCategory(select, "Non catégorisé");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() =>
      expect(service.putCharge).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ categoryId: null })
      )
    );
  });
  it("conserve le lien et les valeurs si la lecture des catégories échoue", async () => {
    categoryService.listAll.mockRejectedValue(new Error("offline"));
    charges = [
      {
        ...annual,
        categoryId: 10,
        category: { id: 10, name: "Assurances", icon: null, color: null },
      },
    ];
    service.putCharge.mockResolvedValue({ data: { success: true } });
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier Assurance" })
    );
    expect(
      await screen.findByRole("button", { name: "Réessayer les catégories" })
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Catégorie" })
    ).toHaveTextContent("Assurances");
    fill("Montant total par échéance", "240");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() =>
      expect(service.putCharge).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ categoryId: 10, montant: 240 })
      )
    );
  });

  it("édite dans les colonnes existantes sans déplacer la ligne, et annule sans écrire", async () => {
    show();
    const edit = await screen.findByRole("button", {
      name: "Modifier Assurance",
    });
    const table = screen.getByRole("table");
    const originalRow = edit.closest("tr");
    const index = rows().indexOf(originalRow);
    fireEvent.click(edit);
    const title = within(table).getByLabelText("Titre de la charge");
    expect(title.closest("tr")).toBe(rows()[index]);
    expect(
      screen.queryByRole("heading", { name: "Modifier un élément fixe" })
    ).not.toBeInTheDocument();
    fill("Montant total par échéance", "240");
    expect(service.putCharge).not.toHaveBeenCalled();
    expect(
      within(title.closest("tr")).getByLabelText("Aperçu mensuel personnel")
    ).toHaveTextContent(/10,00/);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(service.putCharge).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Modifier Assurance" })
    ).toHaveFocus();
    expect(rows()[index]).toHaveTextContent(/5,01/);
  });

  it("affiche le détail mobile, permet de trier les champs et revient à la ligne après Échap", async () => {
    window.matchMedia.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    show();
    const name = await screen.findByRole("button", {
      name: "Assurance",
      exact: true,
    });
    const row = name.closest("tr");
    expect(
      screen.getByRole("table", { name: "Charges et entrées fixes" })
    ).toBeInTheDocument();
    fill("Trier par", "pourcentagePersonnel");
    fill("Ordre du tri", "asc");
    expect(rows()[0]).toBe(row);
    fireEvent.click(
      within(row).getByRole("button", { name: "Assurance", exact: true })
    );
    fireEvent.click(
      within(row).getByRole("button", { name: "Modifier Assurance" })
    );
    expect(screen.getByLabelText("Titre de la charge")).toHaveFocus();
    expect(
      screen.getByLabelText("Titre de la charge").closest("tr")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Titre de la charge")).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("Titre de la charge"), {
      key: "Escape",
    });
    expect(
      screen.getByRole("button", { name: "Modifier Assurance" })
    ).toHaveFocus();
  });
  it("signale la liste partielle et ne remplace pas le budget inconnu par zéro", async () => {
    service.getAllRevenus.mockRejectedValueOnce(new Error("offline"));
    budgetService.getSummary.mockRejectedValueOnce(new Error("offline"));
    show();
    expect(
      await screen.findByRole("button", {
        name: "Réessayer le chargement des entrées",
      })
    ).toBeVisible();
    expect(
      screen.queryByText("Aucune charge ni entrée fixe enregistrée.")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Solde fixe mensuel")
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Réessayer le chargement des entrées",
      })
    );
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(
      screen.getByRole("button", { name: "Réessayer le budget" })
    );
    expect(
      await screen.findByLabelText("Solde fixe mensuel")
    ).toHaveTextContent(/2\s*094,99/);
  });
  it("ne rejoue pas une entrée enregistrée si la relecture échoue", async () => {
    show();
    await screen.findByRole("button", { name: "Modifier Salaire" });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(screen.getByRole("radio", { name: "Entrée" }));
    fill("Titre de l’entrée", "Pension");
    fill("Montant reçu par mois", "100");
    service.getAllRevenus.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’entrée" })
    );
    const retry = await screen.findByRole("button", {
      name: "Réessayer le chargement des entrées",
    });
    expect(retry).toHaveFocus();
    expect(
      screen.queryByLabelText("Titre de l’entrée")
    ).not.toBeInTheDocument();
    fireEvent.click(retry);
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(service.postRevenus).toHaveBeenCalledTimes(1);
  });
  it("conserve une saisie refusée et bloque une double soumission d’entrée", async () => {
    let reject;
    service.postRevenus.mockImplementationOnce(
      () =>
        new Promise((_, failure) => {
          reject = failure;
        })
    );
    show();
    await screen.findByRole("button", { name: "Modifier Salaire" });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fireEvent.click(screen.getByRole("radio", { name: "Entrée" }));
    fill("Titre de l’entrée", "Pension");
    fill("Montant reçu par mois", "0,50");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’entrée" })
    );
    expect(screen.getByLabelText("Montant reçu par mois")).toHaveFocus();
    expect(service.postRevenus).not.toHaveBeenCalled();
    fill("Montant reçu par mois", "100");
    const save = screen.getByRole("button", { name: "Enregistrer l’entrée" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(service.postRevenus).toHaveBeenCalledTimes(1);
    reject(new Error("offline"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer l’entrée" })
      ).toBeEnabled()
    );
    expect(screen.getByLabelText("Montant reçu par mois")).toHaveValue("100");
  });
  it("garde les indicateurs séparés par devise et écarte une réponse tardive", async () => {
    let finishEUR;
    budgetService.getSummary
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishEUR = resolve;
          })
      )
      .mockResolvedValueOnce({
        fixedIncome: "100.00",
        fixedExpense: "20.00",
        base: "80.00",
        realRemaining: "70.00",
      });
    show();
    fill("Devise des indicateurs", "USD");
    expect(
      await screen.findByLabelText("Solde fixe mensuel")
    ).toHaveTextContent(/80,00/);
    finishEUR({
      fixedIncome: "2100.00",
      fixedExpense: "5.01",
      base: "2094.99",
      realRemaining: "1834.42",
    });
    fireEvent.click(screen.getByText("Voir le reste à vivre du mois"));
    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "Reste à vivre du mois en dollars" })
      ).toHaveTextContent(/70,00/)
    );
    expect(screen.getByLabelText("Solde fixe mensuel")).toHaveTextContent(
      /80,00/
    );
    expect(budgetService.getSummary).toHaveBeenLastCalledWith(
      expect.any(String),
      "USD"
    );
  });
  it("mutualise les types avec identifiants identiques et trie les montants serveur", async () => {
    show();
    expect(
      screen.getByRole("heading", {
        name: "Charges et entrées fixes",
        level: 1,
      })
    ).toBeInTheDocument();
    const table = await screen.findByRole("table", {
      name: "Charges et entrées fixes",
    });
    await waitFor(() =>
      expect(within(table).getAllByRole("row")).toHaveLength(3)
    );
    expect(rows()[0]).toHaveTextContent("Salaire");
    expect(rows()[1]).toHaveTextContent(/Assurance.*5,01/s);
    fill("Trier par", "montant");
    fill("Ordre du tri", "asc");
    expect(rows()[0]).toHaveTextContent("Assurance");
    fill("Trier par", "titre");
    fill("Ordre du tri", "asc");
    expect(
      screen.getByRole("columnheader", { name: /Libellé/ })
    ).toHaveAttribute("aria-sort", "ascending");
    expect(
      screen
        .getAllByRole("columnheader")
        .filter((h) => h.hasAttribute("aria-sort"))
    ).toHaveLength(1);
    expect(screen.getByLabelText("Trier par").options).toHaveLength(9);
    expect(
      await screen.findByLabelText("Entrées fixes mensuelles")
    ).toHaveTextContent(/2\s*100,00/);
    expect(screen.getByLabelText("Solde fixe mensuel")).toHaveTextContent(
      /2\s*094,99/
    );
    fireEvent.click(screen.getByText("Voir le reste à vivre du mois"));
    expect(
      screen.getByRole("region", { name: "Reste à vivre du mois en euros" })
    ).toHaveTextContent(/1\s*834,42/);
  });
  it("conserve chaque brouillon et crée une entrée mensuelle sans champs de charge", async () => {
    show();
    await screen.findByRole("table", { name: "Charges et entrées fixes" });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    fill("Titre de la charge", "Loyer partagé");
    fill("Montant total par échéance", "1000");
    fill("Ma part de la charge (%)", "50");
    fireEvent.click(screen.getByRole("radio", { name: "Entrée" }));
    fill("Titre de l’entrée", "Pension");
    fill("Montant reçu par mois", "250,50");
    fireEvent.click(screen.getByRole("radio", { name: "Charge" }));
    expect(screen.getByLabelText("Titre de la charge")).toHaveValue(
      "Loyer partagé"
    );
    expect(screen.getByLabelText("Ma part de la charge (%)")).toHaveValue("50");
    fireEvent.click(screen.getByRole("radio", { name: "Entrée" }));
    expect(screen.getByLabelText("Montant reçu par mois")).toHaveValue(
      "250,50"
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’entrée" })
    );
    await waitFor(() =>
      expect(service.postRevenus).toHaveBeenCalledWith({
        titre: "Pension",
        montant: 250.5,
        devise: "EUR",
        categoryId: null,
      })
    );
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.getByRole("button", { name: "Ajouter" })).toHaveFocus();
    expect(budgetService.getSummary.mock.calls.length).toBeGreaterThan(1);
  });
  it("édite et supprime une entrée par sa route, avec confirmation et type verrouillé", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier Salaire" })
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeVisible();
    expect(screen.queryByLabelText("Périodicité")).not.toBeInTheDocument();
    fill("Montant reçu par mois", "2100");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’entrée" })
    );
    await waitFor(() =>
      expect(service.putRevenu).toHaveBeenCalledWith(7, {
        titre: "Salaire",
        montant: 2100,
        devise: "EUR",
        categoryId: null,
      })
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Supprimer Salaire" })
    );
    expect(service.deleteRevenu).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer la suppression" })
    );
    await waitFor(() => expect(service.deleteRevenu).toHaveBeenCalledWith(7));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent("Assurance");
  });
});

const chooseCategory = (select, name) => {
  if (select.getAttribute("aria-expanded") !== "true") fireEvent.click(select);
  fireEvent.click(screen.getByRole("option", { name }));
};

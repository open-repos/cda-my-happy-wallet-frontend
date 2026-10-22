import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CardOperationFixe from "../../src/js/components/OperationsFixes/CardOperationFixe";
import reducer from "../../src/js/slices/operationsFixes/operationsFixesSlice";
import service from "../../src/js/services/operationsFixesService";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";

vi.mock("../../src/js/services/operationsFixesService", () => ({
  default: {
    getAllCharges: vi.fn(),
    getAllRevenus: vi.fn(),
    postCharges: vi.fn(),
    putCharge: vi.fn(),
    deleteCharge: vi.fn(),
  },
}));
const annual = {
  idOperationFixe: 7,
  titre: "Abonnement",
  montant: "120",
  devise: "EUR",
  periodicite: "ANNUELLE",
  pourcentagePersonnel: 50,
  montantPersonnel: "60.00",
  montantMensuelPersonnel: "5.00",
};
let rows;
const show = () =>
  render(
    <Provider store={configureStore({ reducer: { operationsFixes: reducer } })}>
      <SimulationProvider>
        <CardOperationFixe name="Mes charges" typeOpFixe="charges" />
      </SimulationProvider>
    </Provider>
  );
const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => {
  rows = [];
  service.getAllCharges.mockImplementation(async () => ({
    data: { data: rows },
  }));
  service.getAllRevenus.mockResolvedValue({ data: { data: [] } });
  service.postCharges.mockImplementation(async (body) => {
    rows = [{ ...annual, ...body }];
    return { data: { data: rows[0] } };
  });
  service.putCharge.mockImplementation(async (id, body) => {
    rows = [{ ...annual, ...body }];
    return { data: { success: true } };
  });
  service.deleteCharge.mockImplementation(async () => {
    rows = [];
    return { data: { success: true } };
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("charges fixes périodiques #238", () => {
  it("prévisualise et enregistre 120 €/an à 50 % sans changer le total", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une charge" })
    );
    fill("Titre de la charge", "Abonnement");
    fill("Montant total par échéance", "120");
    fill("Périodicité", "ANNUELLE");
    fill("Ma part de la charge (%)", "50");
    const preview = screen.getByRole("region", { name: "Aperçu de la charge" });
    expect(preview).toHaveTextContent(/60,00.*5,00/);
    expect(screen.getByLabelText("Montant total par échéance")).toHaveValue(
      "120"
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() =>
      expect(service.postCharges).toHaveBeenCalledWith({
        titre: "Abonnement",
        montant: 120,
        devise: "EUR",
        periodicite: "ANNUELLE",
        pourcentagePersonnel: 50,
      })
    );
    const row = await screen.findByRole("article", { name: "Abonnement" });
    expect(row).toHaveTextContent(/Annuelle/);
    expect(row).toHaveTextContent(/5,00/);
    fireEvent.click(
      within(row).getByRole("button", { name: "Modifier Abonnement" })
    );
    expect(screen.getByLabelText("Périodicité")).toHaveValue("ANNUELLE");
    expect(screen.getByLabelText("Ma part de la charge (%)")).toHaveValue("50");
  });
});

describe("édition, compatibilité et erreurs", () => {
  it("relit la charge après PUT et demande confirmation avant DELETE", async () => {
    rows = [annual];
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier Abonnement" })
    );
    fill("Ma part de la charge (%)", "40");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() =>
      expect(service.putCharge).toHaveBeenCalledWith(7, {
        ...annualBody(),
        pourcentagePersonnel: 40,
      })
    );
    await screen.findByRole("button", { name: "Modifier Abonnement" });
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer Abonnement" })
    );
    expect(service.deleteCharge).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Conserver la charge" })
    );
    expect(service.deleteCharge).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer Abonnement" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer la suppression" })
    );
    await waitFor(() => expect(service.deleteCharge).toHaveBeenCalledWith(7));
    expect(
      await screen.findByText("Aucune charge fixe enregistrée.")
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter une charge" })
    ).toHaveFocus();
  });
  it("préserve les anciennes charges mensuelles à 100 % et affiche les montants serveur", async () => {
    rows = [
      {
        idOperationFixe: 1,
        titre: "Ancien loyer",
        montant: "650",
        devise: "EUR",
      },
      { ...annual, montantMensuelPersonnel: "5.01" },
    ];
    show();
    const legacy = await screen.findByRole("article", { name: "Ancien loyer" });
    expect(legacy).toHaveTextContent(/Mensuelle/);
    expect(legacy).toHaveTextContent(/100 %/);
    expect(legacy).toHaveTextContent(/650,00/);
    expect(
      await screen.findByRole("article", { name: "Abonnement" })
    ).toHaveTextContent(/5,01/);
    fireEvent.click(
      within(legacy).getByRole("button", { name: "Modifier Ancien loyer" })
    );
    expect(screen.getByLabelText("Périodicité")).toHaveValue("MENSUELLE");
    expect(screen.getByLabelText("Ma part de la charge (%)")).toHaveValue(
      "100"
    );
    expect(screen.getByLabelText("Montant total par échéance")).toHaveValue(
      "650"
    );
  });
  it("annonce une panne de lecture puis permet de réessayer", async () => {
    service.getAllCharges.mockRejectedValueOnce(new Error("offline"));
    show();
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .some(
            (node) =>
              node.textContent === "Les charges n’ont pas pu être chargées."
          )
      ).toBe(true)
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Réessayer le chargement des charges",
      })
    );
    expect(
      await screen.findByText("Aucune charge fixe enregistrée.")
    ).toBeVisible();
  });
  it("garde la saisie après refus serveur et bloque les doubles soumissions", async () => {
    let reject;
    service.postCharges.mockImplementationOnce(
      () =>
        new Promise((_, failure) => {
          reject = failure;
        })
    );
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une charge" })
    );
    fill("Titre de la charge", "Abonnement");
    fill("Montant total par échéance", "120");
    const save = screen.getByRole("button", { name: "Enregistrer la charge" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(service.postCharges).toHaveBeenCalledTimes(1);
    reject(new Error("offline"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer la charge" })
      ).toBeEnabled()
    );
    expect(screen.getByLabelText("Montant total par échéance")).toHaveValue(
      "120"
    );
    expect(
      await screen.findByText(/La charge n’a pas pu être enregistrée/, {
        selector: '[aria-hidden="true"]',
      })
    ).toBeVisible();
  });
  it("ne repropose pas une création déjà enregistrée si sa relecture échoue", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une charge" })
    );
    service.getAllCharges.mockRejectedValueOnce(new Error("offline"));
    fill("Titre de la charge", "Abonnement");
    fill("Montant total par échéance", "120");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Enregistrer la charge" })
      ).not.toBeInTheDocument()
    );
    expect(service.postCharges).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Réessayer le chargement des charges",
      })
    );
    expect(
      await screen.findByRole("article", { name: "Abonnement" })
    ).toBeVisible();
  });
});
const annualBody = () => ({
  titre: "Abonnement",
  montant: 120,
  devise: "EUR",
  periodicite: "ANNUELLE",
  pourcentagePersonnel: 50,
});

describe("saisie accessible", () => {
  it("place le focus sur le pourcentage invalide et conserve le montant", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une charge" })
    );
    expect(screen.getByLabelText("Titre de la charge")).toHaveFocus();
    fill("Titre de la charge", "Loyer");
    fill("Montant total par échéance", "1000");
    fill("Ma part de la charge (%)", "100.01");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    const percentage = screen.getByLabelText("Ma part de la charge (%)");
    expect(percentage).toHaveFocus();
    expect(percentage).toHaveAttribute("aria-invalid", "true");
    expect(percentage).toHaveAccessibleDescription(/0 à 100.*deux décimales/);
    expect(service.postCharges).not.toHaveBeenCalled();
    fill("Ma part de la charge (%)", "0");
    expect(
      screen.getByRole("region", { name: "Aperçu de la charge" })
    ).toHaveTextContent(/0,00/);
    fireEvent.keyDown(percentage, { key: "Escape" });
    expect(
      screen.getByRole("button", { name: "Ajouter une charge" })
    ).toHaveFocus();
  });
  it("annonce l’échec d’une suppression sans retirer la charge", async () => {
    rows = [annual];
    service.deleteCharge.mockRejectedValueOnce(new Error("offline"));
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Supprimer Abonnement" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer la suppression" })
    );
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .some((node) =>
            node.textContent.includes("La charge n’a pas pu être enregistrée")
          )
      ).toBe(true)
    );
    expect(
      screen.getByRole("article", { name: "Abonnement" })
    ).toBeInTheDocument();
  });
});

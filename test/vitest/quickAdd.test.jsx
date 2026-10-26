import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  QuickAddProvider,
  useQuickAdd,
} from "../../src/js/components/QuickAdd/QuickAddProvider";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { oneOffOperationsService as operations } from "../../src/js/services/oneOffOperationsService";
import { monthlyEventsService as events } from "../../src/js/services/monthlyEventsService";
import { AcknowledgedWriteError } from "../../src/js/utils/acknowledgedWrite";
vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listAllCategories: vi.fn(),
    createOperation: vi.fn(),
  },
}));
vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: { createEvent: vi.fn(), createPotentialEvent: vi.fn() },
}));
const Probe = () => {
  const { open } = useQuickAdd();
  return (
    <button onClick={(e) => open("menu", "2099-10-26", e.currentTarget)}>
      Ajouter le jour sélectionné
    </button>
  );
};
const show = () =>
  render(
    <MemoryRouter initialEntries={["/calendrier"]}>
      <SimulationProvider>
        <QuickAddProvider>
          <Probe />
        </QuickAddProvider>
      </SimulationProvider>
    </MemoryRouter>
  );
const fill = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => {
  vi.resetAllMocks();
  operations.listAllCategories.mockResolvedValue([
    { id: 2, name: "Alimentation" },
  ]);
  operations.createOperation.mockResolvedValue({ id: 1 });
  events.createEvent.mockResolvedValue({ id: 1 });
  events.createPotentialEvent.mockResolvedValue({ id: 1 });
});
afterEach(cleanup);
describe("shared quick add", () => {
  it("keeps the selected day and income intent, locks double submission and restores focus", async () => {
    let finish;
    operations.createOperation.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    show();
    const trigger = screen.getByRole("button", {
      name: "Ajouter le jour sélectionné",
    });
    fireEvent.click(trigger);
    fireEvent.click(
      screen.getByRole("button", { name: /^Entrée Opération réelle/ })
    );
    await screen.findByRole("heading", { name: "Ajouter une opération" });
    expect(screen.getByLabelText("Date")).toHaveValue("2099-10-26");
    expect(
      screen.getByLabelText("Entrée", { selector: "input" })
    ).toBeChecked();
    fill("Titre", "Remboursement");
    fill(/^Montant/, "32.50");
    fireEvent.click(screen.getByRole("combobox", { name: "Catégorie" }));
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    const submit = screen.getByRole("button", { name: "Enregistrer" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(operations.createOperation).toHaveBeenCalledTimes(1);
    expect(operations.createOperation).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "ENTREE", operationDate: "2099-10-26" })
    );
    await act(async () => finish({ id: 1 }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it("creates a potential event without ever creating a real operation", async () => {
    show();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter le jour sélectionné" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /^Événement à confirmer/ })
    );
    fill("Titre", "Projet fictif");
    fill(/^Montant/, "150");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(events.createPotentialEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2099-10-26",
          recurrence: "AUCUNE",
        })
      )
    );
    expect(events.createEvent).not.toHaveBeenCalled();
    expect(operations.createOperation).not.toHaveBeenCalled();
  });
  it("keeps the failed draft and cancel sends no additional write", async () => {
    events.createEvent.mockRejectedValue(new Error("offline"));
    show();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter le jour sélectionné" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /^Événement confirmé/ })
    );
    fill("Titre", "Événement prévu");
    fill(/^Montant/, "42");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled()
    );
    expect(screen.getByLabelText("Titre")).toHaveValue("Événement prévu");
    fireEvent.click(
      screen.getByRole("button", { name: "Annuler", exact: true })
    );
    expect(events.createEvent).toHaveBeenCalledTimes(1);
  });
  it("never treats an acknowledged invalid DTO as a retryable write", async () => {
    events.createEvent.mockRejectedValue(new AcknowledgedWriteError());
    show();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter le jour sélectionné" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: /^Événement confirmé/ })
    );
    fill("Titre", "Écriture acquittée");
    fill(/^Montant/, "42");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(events.createEvent).toHaveBeenCalledTimes(1);
  });
});

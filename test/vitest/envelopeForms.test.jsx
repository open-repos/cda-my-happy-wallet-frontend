import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { apiPrivate } from "../../src/utils/axiosHelper";
import { OneOffOperationForm } from "../../src/js/components/OneOffOperations/OneOffOperationForm";
import { FixedChargeForm } from "../../src/js/components/OperationsFixes/FixedChargeForm";
import { FixedIncomeForm } from "../../src/js/components/OperationsFixes/FixedIncomeForm";
import {
  envelopeMonth,
  shiftEnvelopeMonth,
} from "../../src/js/utils/envelopes";
import {
  envelopeCategory,
  envelopeOccurrence,
  envelopeIntegration,
  envelopeMeta,
} from "../fixtures/envelopes.mjs";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn() },
}));
const month = envelopeMonth(),
  date = `${month}-12`;
const op = {
  id: 1,
  title: "Courses",
  amount: "85.00",
  type: "DEPENSE",
  currency: "EUR",
  operationDate: date,
  categoryId: 4,
};
let linked, closed;
const change = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const form = (props = {}) => {
  const onSave = vi.fn().mockResolvedValue(false);
  render(
    <OneOffOperationForm
      categories={[envelopeCategory]}
      initialDate={date}
      onSave={onSave}
      onCancel={() => {}}
      {...props}
    />
  );
  return onSave;
};
const fillNew = () => {
  change("Titre", "Courses");
  change(/^Montant/, "85.00");
  fireEvent.click(screen.getByRole("combobox", { name: "Catégorie" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Catégorie" }), {
    key: "End",
  });
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Catégorie" }), {
    key: "Enter",
  });
};
beforeEach(() => {
  linked = null;
  closed = false;
  vi.clearAllMocks();
  apiPrivate.get.mockImplementation(async (path) => {
    if (/\/operations\/1\/reconciliation$/.test(path))
      return { data: { data: { operationId: 1, occurrenceId: linked } } };
    if (/\/occurrences\/41$/.test(path))
      return { data: { data: envelopeOccurrence({ month, closed }) } };
    return {
      data: {
        data: [
          envelopeOccurrence({ month }),
          {
            ...envelopeOccurrence({ month, id: 42, sourceId: 8 }),
            title: "Alimentation famille",
          },
        ],
        meta: envelopeMeta,
        integration: envelopeIntegration,
      },
    };
  });
});
afterEach(cleanup);
describe("explicit and atomic assignment in the shared calendar/operations form", () => {
  it("leaves an ambiguous suggestion unselected, then saves the explicit choice in the same body", async () => {
    const save = form();
    fillNew();
    await screen.findByRole("button", { name: "Choisir Alimentation" });
    expect(screen.getByLabelText("Rattacher à une enveloppe")).toHaveValue("");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).not.toHaveProperty("reconciliation");
    fireEvent.click(
      screen.getByRole("button", { name: "Choisir Alimentation famille" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0]).toMatchObject({
      title: "Courses",
      amount: "85.00",
      operationDate: date,
      reconciliation: { occurrenceId: 42, expectedOccurrenceId: null },
    });
    expect(screen.getByLabelText("Titre")).toHaveValue("Courses");
  });
  it("requires explicit unlink after changing a linked month, preserving the other draft fields", async () => {
    linked = 41;
    const save = form({ operation: op });
    await waitFor(() =>
      expect(screen.getByLabelText("Rattacher à une enveloppe")).toHaveValue(
        "41"
      )
    );
    change("Date", `${shiftEnvelopeMonth(month, 1)}-12`);
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await screen.findAllByText(/Le rattachement est incompatible/);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Montant/)).toHaveValue("85.00");
    change("Rattacher à une enveloppe", "");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          reconciliation: { occurrenceId: null, expectedOccurrenceId: 41 },
        })
      )
    );
  });
  it("uses expectedOccurrenceId when reassigning and allows an unchanged PUT to preserve its link", async () => {
    linked = 41;
    const save = form({ operation: op });
    await waitFor(() =>
      expect(screen.getByLabelText("Rattacher à une enveloppe")).toHaveValue(
        "41"
      )
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).not.toHaveProperty("reconciliation");
    change("Rattacher à une enveloppe", "42");
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          reconciliation: { occurrenceId: 42, expectedOccurrenceId: 41 },
        })
      )
    );
  });
  it("prevents saves and deletion of an operation linked to a closed month", async () => {
    linked = 41;
    closed = true;
    const save = form({ operation: op, onDelete: vi.fn() });
    await screen.findByText(/L’opération liée est conservée en lecture seule/);
    expect(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Supprimer", exact: true })
    ).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });
  it("keeps ordinary entry creation possible if envelope loading fails, without an implicit link", async () => {
    apiPrivate.get.mockRejectedValue(new Error("offline"));
    const save = form({ initialKind: "ENTREE" });
    fillNew();
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0]).toMatchObject({ kind: "ENTREE" });
    expect(save.mock.calls[0][0]).not.toHaveProperty("reconciliation");
  });
  it("locks double submission while the combined save is pending", async () => {
    let done;
    const save = vi.fn(() => new Promise((r) => (done = r)));
    form({ onSave: save });
    fillNew();
    await screen.findByRole("button", { name: "Choisir Alimentation" });
    const button = screen.getByRole("button", {
      name: "Enregistrer",
      exact: true,
    });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    done(false);
  });
});
describe("monthly opt-in and future fixed definitions", () => {
  it("schedules a personal-share envelope from next month without duplicating the fixed source", async () => {
    const save = vi.fn().mockResolvedValue(false);
    render(
      <FixedChargeForm
        charge={{
          titre: "Courses",
          montant: "300",
          pourcentagePersonnel: 40,
          devise: "EUR",
        }}
        busy={false}
        onSave={save}
        onClose={() => {}}
      />
    );
    fireEvent.click(
      screen.getByLabelText("Utiliser comme enveloppe budgétaire mensuelle")
    );
    const next = shiftEnvelopeMonth(month, 1);
    change("Appliquer la modification à partir de", next);
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        titre: "Courses",
        montant: 300,
        devise: "EUR",
        periodicite: "MENSUELLE",
        pourcentagePersonnel: 40,
        isBudgetEnvelope: true,
        effectiveMonth: next,
      })
    );
  });
  it("disables envelope opt-in for a nonmonthly charge and retains its periodicity and personal share", () => {
    render(
      <FixedChargeForm
        charge={{
          titre: "Assurance",
          montant: "120",
          periodicite: "ANNUELLE",
          pourcentagePersonnel: 50,
        }}
        onSave={vi.fn()}
        onClose={() => {}}
      />
    );
    expect(
      screen.getByLabelText("Utiliser comme enveloppe budgétaire mensuelle")
    ).toBeDisabled();
    expect(
      screen.getByRole("region", { name: "Aperçu de la charge" })
    ).toHaveTextContent(/60,00.*5,00/s);
  });
  it("schedules income without exposing or sending an envelope flag", async () => {
    const save = vi.fn().mockResolvedValue(false);
    render(
      <FixedIncomeForm
        income={{ titre: "Salaire", montant: "2000", devise: "EUR" }}
        onSave={save}
        onClose={() => {}}
      />
    );
    expect(
      screen.queryByLabelText(/Utiliser comme enveloppe/)
    ).not.toBeInTheDocument();
    change(
      "Appliquer la modification à partir de",
      shiftEnvelopeMonth(month, 1)
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’entrée" })
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        titre: "Salaire",
        montant: 2000,
        devise: "EUR",
        effectiveMonth: shiftEnvelopeMonth(month, 1),
      })
    );
  });
});

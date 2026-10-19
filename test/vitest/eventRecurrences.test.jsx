import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonthlyEventForm } from "../../src/js/components/MonthlyEvents/MonthlyEventForm";
import { MonthlyEventList } from "../../src/js/components/MonthlyEvents/MonthlyEventList";

afterEach(cleanup);
const rule = {
  id: 7,
  title: "Assurance",
  amount: "120.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: "2026-10-31",
  recurrence: "ANNUELLE",
  endDate: "2028-10-31",
};
const { id: _id, ...editableRule } = rule;

describe("event recurrence form", () => {
  it.each([
    ["HEBDOMADAIRE", "Chaque semaine"],
    ["MENSUELLE", "Chaque mois"],
    ["TRIMESTRIELLE", "Chaque trimestre"],
    ["ANNUELLE", "Chaque année"],
  ])(
    "edits %s and preserves its optional inclusive end date",
    async (recurrence, label) => {
      const onSave = vi.fn();
      render(
        <MonthlyEventForm
          event={{ ...rule, recurrence }}
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );
      expect(screen.getByLabelText("Titre")).toHaveFocus();
      expect(screen.getByRole("combobox", { name: "Récurrence" })).toHaveValue(
        recurrence
      );
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Date de fin/), {
        target: { value: "2026-10-30" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Enregistrer" }).closest("form")
      );
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Date de fin/)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expect(screen.getByLabelText(/Date de fin/)).toHaveFocus();
      fireEvent.change(screen.getByLabelText(/Date de fin/), {
        target: { value: "2026-10-31" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
      await waitFor(() =>
        expect(onSave).toHaveBeenCalledWith({
          ...editableRule,
          recurrence,
          endDate: "2026-10-31",
        })
      );
    }
  );

  it("clears the end date when switching to a single event", () => {
    const onSave = vi.fn();
    render(
      <MonthlyEventForm event={rule} onSave={onSave} onCancel={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText("Récurrence"), {
      target: { value: "AUCUNE" },
    });
    expect(screen.queryByLabelText(/Date de fin/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSave).toHaveBeenCalledWith({
      ...editableRule,
      recurrence: "AUCUNE",
      endDate: null,
    });
  });

  it("allows an unbounded weekly series", () => {
    const onSave = vi.fn();
    render(
      <MonthlyEventForm
        event={{ ...rule, recurrence: "HEBDOMADAIRE", endDate: null }}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/Date de fin/)).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onSave).toHaveBeenCalledWith({
      ...editableRule,
      recurrence: "HEBDOMADAIRE",
      endDate: null,
    });
  });

  it.each([
    ["HEBDOMADAIRE", "Chaque semaine jusqu’au 31/10/2028"],
    ["TRIMESTRIELLE", "Chaque trimestre jusqu’au 31/10/2028"],
    ["ANNUELLE", "Chaque année jusqu’au 31/10/2028"],
  ])(
    "describes the %s rule without calling it a one-off event",
    (recurrence, text) => {
      render(
        <MonthlyEventList events={[{ ...rule, recurrence }]} onEdit={vi.fn()} />
      );
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.queryByText("Une seule fois")).not.toBeInTheDocument();
    }
  );
});

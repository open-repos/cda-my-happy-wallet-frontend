import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MonthlyEventForm } from "../../src/js/components/MonthlyEvents/MonthlyEventForm";

afterEach(cleanup);

it("keeps labels and radio selection local when two event forms coexist", () => {
  render(
    <>
      <MonthlyEventForm
        initialDate="2026-10-27"
        formTitle="Prévu"
        onCancel={vi.fn()}
      />
      <MonthlyEventForm
        initialDate="2026-10-28"
        formTitle="Potentiel"
        onCancel={vi.fn()}
      />
    </>
  );
  const forms = screen.getAllByRole("region");
  const first = within(forms[0]);
  const second = within(forms[1]);
  fireEvent.click(second.getByText("Entrée", { selector: "label" }));
  expect(forms[1].querySelector('input[value="ENTREE"]')).toBeChecked();
  expect(first.getByRole("radio", { name: "Dépense" })).toBeChecked();
  fireEvent.click(second.getByText("Dépense", { selector: "label" }));
  expect(second.getByRole("radio", { name: "Dépense" })).toBeChecked();
});

it.each(["ENTREE", "DEPENSE"])(
  "saves an edited %s event without losing dates or recurrence",
  (kind) => {
    const event = {
      id: 4,
      title: "Assurance",
      amount: "120.00",
      currency: "EUR",
      kind,
      startDate: "2026-10-27",
      recurrence: "MENSUELLE",
      endDate: "2027-10-27",
    };
    const onSave = vi.fn();
    const { rerender } = render(
      <MonthlyEventForm event={event} onSave={onSave} onCancel={vi.fn()} />
    );
    fireEvent.change(screen.getByLabelText("Titre"), {
      target: { value: "Assurance habitation" },
    });
    for (const name of ["Entrée", "Dépense", "Entrée", "Dépense"])
      fireEvent.click(screen.getByText(name, { selector: "label" }));
    rerender(
      <MonthlyEventForm
        event={{ ...event }}
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Titre")).toHaveValue("Assurance habitation");
    expect(screen.getByLabelText("Date de début")).toHaveValue(event.startDate);
    expect(screen.getByLabelText(/Date de fin/)).toHaveValue(event.endDate);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    const { id, ...expected } = event;
    expect(onSave).toHaveBeenCalledWith({
      ...expected,
      title: "Assurance habitation",
      kind: "DEPENSE",
    });
  }
);

it("preserves the draft through repeated budget impact changes", async () => {
  const onSave = vi.fn();
  render(
    <MonthlyEventForm
      initialDate="2026-10-27"
      onSave={onSave}
      onCancel={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText("Titre"), {
    target: { value: "Voyage" },
  });
  fireEvent.change(screen.getByLabelText(/^Montant/), {
    target: { value: "120" },
  });
  for (let i = 0; i < 3; i++) {
    fireEvent.click(screen.getByRole("radio", { name: "Entrée" }));
    expect(screen.getByRole("radio", { name: "Entrée" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Dépense" }));
    expect(screen.getByRole("radio", { name: "Dépense" })).toBeChecked();
  }
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Voyage",
      amount: "120",
      startDate: "2026-10-27",
      kind: "DEPENSE",
    })
  );
});

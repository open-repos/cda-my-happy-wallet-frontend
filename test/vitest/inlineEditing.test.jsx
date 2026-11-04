import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { apiPrivate } from "../../src/utils/axiosHelper";
import { OneOffInlineEditor } from "../../src/js/components/OneOffOperations/OneOffInlineEditor";
import { FORM_ACTIVITY_SELECTOR } from "../../src/js/components/Notifications/MutationFeedbackProvider";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn() },
}));

const operation = {
  id: 1,
  title: "Courses",
  amount: "42.50",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: "2026-08-18",
  categoryId: 4,
};
const categories = [{ id: 4, name: "Alimentation", icon: null, color: null }];
const editor = (props = {}) => {
  const onSave = vi.fn();
  render(
    <table>
      <tbody>
        <OneOffInlineEditor
          operation={operation}
          categories={categories}
          onSave={onSave}
          onCancel={vi.fn()}
          {...props}
        />
      </tbody>
    </table>
  );
  return onSave;
};
const row = () => screen.getByLabelText("Titre").closest("tr");

beforeEach(() => {
  vi.clearAllMocks();
  apiPrivate.get.mockRejectedValue(new Error("offline"));
});
afterEach(cleanup);

describe("édition en ligne partagée (#358)", () => {
  it("déplie les champs secondaires dans la ligne sans formulaire complet", () => {
    editor();
    const more = screen.getByRole("button", { name: "Plus d’options" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(row()).not.toHaveClass("is-revealed");
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(row()).toHaveClass("is-revealed");
    expect(
      document.getElementById(more.getAttribute("aria-controls"))
    ).toContainElement(screen.getByLabelText("Devise"));
  });

  it("déplie le champ secondaire en erreur près de son message", () => {
    const onMoreOptions = vi.fn();
    const onSave = editor({
      operation: { ...operation, currency: "GBP" },
      onMoreOptions,
    });
    expect(
      screen.getByRole("button", { name: "Plus d’options" })
    ).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.submit(row().querySelector("form"));
    expect(onSave).not.toHaveBeenCalled();
    expect(onMoreOptions).not.toHaveBeenCalled();
    expect(row()).toHaveClass("is-revealed");
  });

  it("transmet le brouillon au formulaire complet", () => {
    const onMoreOptions = vi.fn();
    editor({ onMoreOptions });
    fireEvent.change(screen.getByLabelText("Titre"), {
      target: { value: "Courses bio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Plus d’options" }));
    expect(onMoreOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        title: "Courses bio",
        type: "DEPENSE",
        categoryId: 4,
      })
    );
  });

  it("déplie la ligne sur une erreur secondaire dans le calendrier", () => {
    editor({ operation: { ...operation, currency: "GBP" } });
    fireEvent.submit(row().querySelector("form"));
    expect(row()).toHaveClass("is-revealed");
    expect(screen.getByLabelText("Devise")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("affiche un message court et garde le message complet en description", () => {
    editor();
    fireEvent.change(screen.getByLabelText("Montant (EUR)"), {
      target: { value: "4,2,5" },
    });
    fireEvent.submit(row().querySelector("form"));
    const amount = screen.getByLabelText("Montant (EUR)");
    expect(amount).toHaveAccessibleDescription(
      "Saisissez un montant positif avec deux décimales maximum, par exemple 12,50."
    );
    expect(
      document.querySelector(`#${amount.id}-message .inline-cell__short`)
    ).toHaveTextContent("Invalide, ex. 12,50");
  });

  it("signale la ligne en édition comme une saisie en cours", () => {
    editor();
    expect(row().matches(FORM_ACTIVITY_SELECTOR)).toBe(true);
  });

  it("enregistre avec Entrée depuis une liste et annule avec Échap", () => {
    const onCancel = vi.fn();
    const onSave = editor({ onCancel });
    fireEvent.keyDown(screen.getByLabelText("Type"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Courses", amount: "42.50" })
    );
    fireEvent.keyDown(screen.getByLabelText("Titre"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

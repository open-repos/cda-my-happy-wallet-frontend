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
import { MonthlyEventForm } from "../../src/js/components/MonthlyEvents/MonthlyEventForm";
import { RealizeOccurrenceForm } from "../../src/js/components/BudgetCalendar/RealizeOccurrenceForm";
import {
  FinancialGoalForm,
  validateGoal,
} from "../../src/js/components/FinancialGoals/FinancialGoalForm";
import { normalizedAssumption } from "../../src/js/components/FinancialGoals/SavingsTrajectorySimulation";
import { validateOperation } from "../../src/js/utils/oneOffOperationForm";
import { normalizeDecimal } from "../../src/js/utils/decimalInput";
import { chargeBody, validateCharge } from "../../src/js/utils/fixedCharges";
import { incomeBody, validateIncome } from "../../src/js/utils/fixedIncome";
import { envelopeCategory } from "../fixtures/envelopes.mjs";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn() },
}));

const invalid = ["12,5,0", "12.5.0", "1.200,50", "12a", "abc", "12,555"];
const change = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  apiPrivate.get.mockRejectedValue(new Error("offline"));
});
afterEach(cleanup);

describe("opérations ponctuelles : formulaire et éditeur en ligne", () => {
  const operation = (amount) => ({
    title: "Courses",
    amount,
    operationDate: "2026-11-04",
    categoryId: "4",
    currency: "EUR",
  });
  it.each(["12,50", "12.50", "12,5", "1 012,50"])(
    "accepte %j et l'envoie au point",
    (amount) => {
      expect(validateOperation(operation(amount), new Set([4]))).toEqual({});
    }
  );
  it("envoie la même valeur avec la virgule et le point", () => {
    expect(normalizeDecimal("12,50")).toBe("12.50");
    expect(normalizeDecimal("12.5")).toBe("12.50");
  });
  it.each([...invalid, "0", "0,00", "-12", "100000000"])(
    "refuse %j",
    (amount) => {
      expect(validateOperation(operation(amount), new Set([4]))).toHaveProperty(
        "amount"
      );
    }
  );
  it("enregistre 85,50 saisi avec une virgule comme 85.50", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(
      <OneOffOperationForm
        categories={[envelopeCategory]}
        initialDate="2026-11-04"
        initialKind="ENTREE"
        onSave={onSave}
        onCancel={() => {}}
      />
    );
    expect(screen.getByLabelText(/^Montant/)).toHaveAttribute(
      "inputmode",
      "decimal"
    );
    change("Titre", "Courses");
    change(/^Montant/, "85,50");
    const category = screen.getByRole("combobox", { name: "Catégorie" });
    fireEvent.click(category);
    fireEvent.keyDown(category, { key: "End" });
    fireEvent.keyDown(category, { key: "Enter" });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer", exact: true })
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({ amount: "85.50" });
  });
});

describe("événements prévus", () => {
  const fill = (amount) => {
    const onSave = vi.fn();
    render(
      <MonthlyEventForm
        initialDate="2026-11-04"
        onSave={onSave}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/^Montant/)).toHaveAttribute(
      "inputmode",
      "decimal"
    );
    change("Titre", "Voyage");
    change(/^Montant/, amount);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    return onSave;
  };
  it.each(["12,50", "12.50"])("enregistre %j comme 12.50", (amount) => {
    expect(fill(amount)).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "12.50" })
    );
  });
  it.each(invalid)("refuse %j avec un message lié au champ", (amount) => {
    const onSave = fill(amount);
    expect(onSave).not.toHaveBeenCalled();
    const input = screen.getByLabelText(/^Montant/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/montant positif/i);
  });
});

describe("réalisation d'une échéance", () => {
  const occurrence = {
    title: "Assurance",
    amount: "120.00",
    currency: "EUR",
    kind: "DEPENSE",
    occurrenceDate: "2026-11-04",
  };
  const submit = (amount) => {
    const onSave = vi.fn();
    render(
      <RealizeOccurrenceForm
        occurrence={occurrence}
        categories={[{ id: 3, name: "Assurances", icon: null }]}
        defaultDate="2026-11-04"
        onCancel={vi.fn()}
        onSave={onSave}
      />
    );
    expect(screen.getByLabelText(/^Montant/)).toHaveAttribute(
      "inputmode",
      "decimal"
    );
    change(/^Montant/, amount);
    fireEvent.submit(screen.getByLabelText(/^Montant/).closest("form"));
    return onSave;
  };
  it.each(["118,40", "118.40", "118,4"])(
    "enregistre %j comme 118.40",
    (amount) => {
      expect(submit(amount)).toHaveBeenCalledWith(
        expect.objectContaining({ amount: "118.40" })
      );
    }
  );
  it.each(invalid)("refuse %j", (amount) => {
    expect(submit(amount)).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Montant/)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });
});

describe("objectifs d'épargne", () => {
  const goal = (amount) => ({
    title: "Voyage",
    targetAmount: amount,
    savedAmount: "0",
    monthlyContribution: "75,5",
    targetDate: "",
  });
  it.each(["1 200,50", "1200,50", "1200.50"])("accepte %j", (amount) => {
    expect(validateGoal(goal(amount))).toEqual({});
  });
  it.each(invalid)("refuse %j", (amount) => {
    expect(validateGoal(goal(amount))).toHaveProperty("targetAmount");
  });
  it("enregistre les montants au point, avec deux décimales", async () => {
    const onSave = vi.fn();
    render(
      <FinancialGoalForm onSave={onSave} onCancel={vi.fn()} isSaving={false} />
    );
    for (const label of [
      /^Montant cible/,
      /^Déjà épargné/,
      /^Versement mensuel prévu/,
    ])
      expect(screen.getByLabelText(label)).toHaveAttribute(
        "inputmode",
        "decimal"
      );
    change(/^Titre/, "Voyage");
    change(/^Montant cible/, "1 200,5");
    change(/^Déjà épargné/, "150.25");
    change(/^Versement mensuel prévu/, "75,50");
    fireEvent.submit(screen.getByLabelText(/^Montant cible/).closest("form"));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      targetAmount: "1200.50",
      savedAmount: "150.25",
      monthlyContribution: "75.50",
    });
  });
  it("normalise l'hypothèse de simulation saisie avec une virgule", () => {
    expect(normalizedAssumption("75,5")).toBe("75.50");
    expect(normalizedAssumption("75.5")).toBe("75.50");
    expect(normalizedAssumption("75,5,0")).toBeNull();
  });
});

describe("charges et entrées fixes : formulaires et éditeur en ligne", () => {
  const charge = (montant, pourcentagePersonnel = "100") => ({
    titre: "Loyer",
    montant,
    devise: "EUR",
    periodicite: "MENSUELLE",
    pourcentagePersonnel,
    effectiveMonth: "",
  });
  it("donne le même corps avec la virgule et le point", () => {
    expect(chargeBody(charge("650,50", "50,5"))).toEqual(
      chargeBody(charge("650.50", "50.5"))
    );
    expect(chargeBody(charge("1 650,50")).montant).toBe(1650.5);
  });
  it.each(invalid)("refuse la charge %j", (amount) => {
    expect(validateCharge(charge(amount))).toHaveProperty("montant");
    expect(validateCharge(charge("10", amount))).toHaveProperty(
      "pourcentagePersonnel"
    );
  });
  const income = (montant) => ({
    titre: "Salaire",
    montant,
    devise: "EUR",
    effectiveMonth: "",
  });
  it("donne la même entrée avec la virgule et le point", () => {
    expect(incomeBody(income("2 000,50"))).toEqual(
      incomeBody(income("2000.50"))
    );
    expect(incomeBody(income("2000,5")).montant).toBe(2000.5);
  });
  it.each(invalid)("refuse l'entrée %j", (amount) => {
    expect(validateIncome(income(amount))).toHaveProperty("montant");
  });
});

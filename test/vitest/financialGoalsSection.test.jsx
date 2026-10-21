import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinancialGoalsSection } from "../../src/js/components/FinancialGoals/FinancialGoalsSection";
import { validateGoal } from "../../src/js/components/FinancialGoals/FinancialGoalForm";
import { useFinancialGoals } from "../../src/js/hooks/useFinancialGoals";
import { captureLiveRegions, expectAnnouncedIn } from "./liveRegions";

vi.mock("../../src/js/hooks/useFinancialGoals", () => ({
  useFinancialGoals: vi.fn(),
}));
vi.mock(
  "../../src/js/components/FinancialGoals/SavingsCapacitySection",
  () => ({
    SavingsCapacitySection: () => null,
  })
);
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ label }) => <div role="img" aria-label={label} />,
}));

const goal = (overrides = {}) => ({
  id: 3,
  title: "Vélo",
  targetAmount: "1200.00",
  savedAmount: "300.00",
  monthlyContribution: "150.00",
  currency: "EUR",
  targetDate: "2027-03-15",
  forecast: {
    referenceMonth: "2026-10",
    status: "BEHIND",
    remainingAmount: "900.00",
    contributionsNeeded: 6,
    estimatedReachMonth: "2027-04",
    requiredMonthlyContribution: "180.00",
  },
  ...overrides,
});

const state = (overrides = {}) => ({
  goals: [goal()],
  status: "success",
  mutationStatus: "idle",
  message: "",
  retry: vi.fn(),
  createGoal: vi.fn().mockResolvedValue(true),
  updateGoal: vi.fn().mockResolvedValue(true),
  deleteGoal: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const normalize = (text) => text.replace(/\s/g, " ");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FinancialGoalsSection", () => {
  it("opens the requested goal from the home action only once", () => {
    useFinancialGoals.mockReturnValue(state());
    const { rerender } = render(<FinancialGoalsSection initialGoalId={3} />);
    expect(screen.getByLabelText("Titre")).toHaveValue("Vélo");
    expect(screen.getByLabelText("Titre")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    rerender(<FinancialGoalsSection initialGoalId={3} />);
    expect(screen.queryByLabelText("Titre")).not.toBeInTheDocument();
  });

  it("renders a goal card with its ring, amounts and forecast", () => {
    useFinancialGoals.mockReturnValue(state());
    render(<FinancialGoalsSection />);

    const card = screen.getByRole("article", { name: "Vélo" });
    expect(within(card).getByText("En retard")).toBeInTheDocument();
    expect(
      within(card).getByRole("img", { name: /25 % de l’objectif Vélo atteint/ })
    ).toBeInTheDocument();
    expect(normalize(card.textContent)).toContain("Montant visé1 200,00 €");
    expect(normalize(card.textContent)).toContain("Date souhaitée15 mars 2027");
    expect(normalize(card.textContent)).toContain(
      "Le versement mensuel calculé pour tenir la date est de 180,00 €."
    );
  });

  it("announces loading and failure in regions mounted beforehand (#164)", async () => {
    useFinancialGoals.mockReturnValue(state());
    const { rerender } = render(<FinancialGoalsSection />);
    const captured = captureLiveRegions();

    useFinancialGoals.mockReturnValue(state({ status: "loading", goals: [] }));
    rerender(<FinancialGoalsSection />);
    await expectAnnouncedIn(captured, "status", "Chargement des objectifs…");

    useFinancialGoals.mockReturnValue(
      state({ status: "error", goals: [], message: "Impossible" })
    );
    rerender(<FinancialGoalsSection />);
    await expectAnnouncedIn(captured, "alert", "Impossible");
  });

  it("shows loading, error with retry and the first-goal empty state", () => {
    useFinancialGoals.mockReturnValue(state({ status: "loading", goals: [] }));
    const { rerender } = render(<FinancialGoalsSection />);
    expect(
      screen.getByRole("heading", { name: "Chargement des objectifs…" })
    ).toBeInTheDocument();

    const failed = state({ status: "error", goals: [], message: "Impossible" });
    useFinancialGoals.mockReturnValue(failed);
    rerender(<FinancialGoalsSection />);
    expect(screen.getByText("Impossible")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(failed.retry).toHaveBeenCalledTimes(1);

    useFinancialGoals.mockReturnValue(state({ goals: [] }));
    rerender(<FinancialGoalsSection />);
    expect(
      screen.getByRole("heading", { name: "Ajoutez votre premier objectif" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ajouter un objectif" })
    ).not.toBeInTheDocument();
  });

  it("creates a goal with normalized amounts and an optional date", async () => {
    const current = state({ goals: [] });
    useFinancialGoals.mockReturnValue(current);
    render(<FinancialGoalsSection />);

    fireEvent.click(screen.getByRole("button", { name: "C’est parti" }));
    expect(screen.getByLabelText("Titre")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Titre"), {
      target: { value: "  Vacances  " },
    });
    fireEvent.change(screen.getByLabelText(/^Montant cible/), {
      target: { value: "1500" },
    });
    fireEvent.change(screen.getByLabelText(/^Versement mensuel prévu/), {
      target: { value: "100,5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(current.createGoal).toHaveBeenCalledWith({
        title: "Vacances",
        targetAmount: "1500.00",
        savedAmount: "0.00",
        monthlyContribution: "100.50",
        currency: "EUR",
        targetDate: null,
      })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Ajouter un objectif" })
      ).not.toBeInTheDocument()
    );
    // Le focus revient au bouton qui a ouvert le formulaire.
    expect(screen.getByRole("button", { name: "C’est parti" })).toHaveFocus();
  });

  it("reports invalid values next to their field", () => {
    useFinancialGoals.mockReturnValue(state({ goals: [] }));
    render(<FinancialGoalsSection />);
    fireEvent.click(screen.getByRole("button", { name: "C’est parti" }));
    fireEvent.change(screen.getByLabelText(/^Montant cible/), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByLabelText(/^Titre/)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(screen.getByText(/montant cible positif/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ajouter un objectif", level: 3 })
    ).toBeInTheDocument();
  });

  it("edits then deletes a goal after confirmation", async () => {
    const current = state();
    useFinancialGoals.mockReturnValue(current);
    render(<FinancialGoalsSection />);

    fireEvent.click(
      screen.getByRole("button", { name: "Modifier l’objectif Vélo" })
    );
    expect(screen.getByLabelText("Titre")).toHaveValue("Vélo");
    expect(screen.getByLabelText(/Date souhaitée/)).toHaveValue("2027-03-15");
    fireEvent.change(screen.getByLabelText(/^Déjà épargné/), {
      target: { value: "450" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(current.updateGoal).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          savedAmount: "450.00",
          targetDate: "2027-03-15",
        })
      )
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Modifier l’objectif Vélo" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    // La section garde aussi sa région d'alerte, vide (#151).
    expect(
      screen
        .getAllByRole("alert")
        .some((element) =>
          element.textContent.includes("Supprimer cet objectif ?")
        )
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Oui, supprimer" }));
    await waitFor(() => expect(current.deleteGoal).toHaveBeenCalledWith(3));
  });

  it("focuses the section heading when the opener was replaced", async () => {
    const current = state();
    useFinancialGoals.mockReturnValue(current);
    const { rerender } = render(<FinancialGoalsSection />);
    fireEvent.click(
      screen.getByRole("button", { name: "Modifier l’objectif Vélo" })
    );

    // Rechargement : la carte, et donc son bouton, sont remplacés.
    useFinancialGoals.mockReturnValue({ ...current, goals: [goal({ id: 4 })] });
    rerender(<FinancialGoalsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      screen.getByRole("heading", { name: "Objectifs financiers" })
    ).toHaveFocus();
  });
});

describe("validateGoal", () => {
  it("mirrors the backend rules", () => {
    const valid = {
      title: "Vélo",
      targetAmount: "1200",
      savedAmount: "0",
      monthlyContribution: "0",
      targetDate: "",
    };
    expect(validateGoal(valid)).toEqual({});
    expect(Object.keys(validateGoal({ ...valid, title: "V" }))).toEqual([
      "title",
    ]);
    expect(
      Object.keys(validateGoal({ ...valid, targetAmount: "123456789" }))
    ).toEqual(["targetAmount"]);
    expect(Object.keys(validateGoal({ ...valid, savedAmount: "-1" }))).toEqual([
      "savedAmount",
    ]);
    expect(
      Object.keys(validateGoal({ ...valid, monthlyContribution: "1.234" }))
    ).toEqual(["monthlyContribution"]);
    expect(
      Object.keys(validateGoal({ ...valid, targetDate: "2027-02-30" }))
    ).toEqual(["targetDate"]);
  });
});

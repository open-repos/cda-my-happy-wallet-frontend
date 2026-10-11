import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CaseShowRaV from "../../src/js/components/HomeComponents/CaseShowRaV";
import { useHomeBudget } from "../../src/js/hooks/useHomeBudget";

vi.mock("../../src/js/hooks/useHomeBudget", () => ({
  HOME_CURRENCY: "EUR",
  useHomeBudget: vi.fn(),
}));

const summary = (overrides = {}) => ({
  month: "2026-10",
  currency: "EUR",
  realRemaining: "1037.50",
  carryIn: "-120.00",
  carryFromMonth: "2026-09",
  monthResult: "1157.50",
  remainingDays: 12,
  realDailyAllowance: "86.46",
  forecast: {
    forecastRemaining: "767.50",
    prudentDailyAllowance: "63.96",
  },
  ...overrides,
});

const section = (data, status = "success") => ({
  status,
  data,
  reload: vi.fn(),
});

const state = (overrides = {}) => ({
  month: "2026-10",
  summary: section(summary()),
  expenses: section([
    { id: 5, name: "Loisirs", color: null, amount: "60.00", share: 1 },
    {
      id: 4,
      name: "Alimentation",
      color: "#55AA22",
      amount: "42.80",
      share: 0.71,
    },
  ]),
  goals: section({
    saved: "500.00",
    target: "2000.00",
    percent: 25,
    goals: [
      { id: 1, title: "Vélo", saved: "300.00", target: "1200.00", percent: 25 },
    ],
  }),
  ...overrides,
});

const renderHome = () =>
  render(
    <MemoryRouter>
      <CaseShowRaV />
    </MemoryRouter>
  );

const normalize = (text) => text.replace(/\s/g, " ");
const mainAmount = () =>
  normalize(document.querySelector(".home-budget__amount").textContent);

beforeEach(() => useHomeBudget.mockReturnValue(state()));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Home reste à vivre", () => {
  it("shows the month real remaining with a distinct carry line", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Reste à vivre du mois" })
    ).toBeInTheDocument();
    expect(mainAmount()).toBe("1 037,50 €");
    const carry = screen.getByText("Report de septembre").closest("div");
    expect(normalize(carry.textContent)).toContain("-120,00 €");
    expect(
      screen.getByText(/Le déficit de septembre est déduit de ce mois/)
    ).toBeInTheDocument();
  });

  it("shows the weekly prudent share with its explanation", () => {
    renderHome();

    fireEvent.click(screen.getByLabelText("Semaine"));

    expect(
      screen.getByRole("heading", { name: "Reste à vivre sur 7 jours" })
    ).toBeInTheDocument();
    expect(mainAmount()).toBe("447,72 €");
    const help = normalize(screen.getByText(/par jour × 7 jours/).textContent);
    expect(help).toContain("63,96 € par jour × 7 jours");
    expect(help).toContain("reste prévisionnel (767,50 €)");
    expect(help).toContain("12 jours restants du mois");
    expect(screen.queryByText("Report de septembre")).not.toBeInTheDocument();
  });

  it("shows the daily prudent share and explains a negative amount", () => {
    useHomeBudget.mockReturnValue(
      state({
        summary: section(
          summary({
            forecast: {
              forecastRemaining: "-60.00",
              prudentDailyAllowance: "-20.00",
            },
            remainingDays: 3,
          })
        ),
      })
    );
    renderHome();

    fireEvent.click(screen.getByLabelText("Jour"));

    expect(
      screen.getByRole("heading", { name: "Reste à vivre aujourd’hui" })
    ).toBeInTheDocument();
    expect(mainAmount()).toBe("-20,00 €");
    expect(
      screen.getByText(/effort nécessaire pour finir le mois à l’équilibre/)
    ).toBeInTheDocument();
  });

  it("renders the expense chart with a textual equivalent per category", () => {
    renderHome();

    const chart = screen.getByRole("list", { name: "Dépenses par catégorie" });
    const rows = within(chart).getAllByRole("listitem");
    expect(rows.map((row) => normalize(row.textContent))).toEqual([
      "Loisirs60,00 €",
      "Alimentation42,80 €",
    ]);
    expect(
      screen.getByRole("link", { name: "Ajouter une dépense" })
    ).toHaveAttribute("href", "/operations");
  });

  it("renders the goals ring with an accessible label", () => {
    renderHome();

    expect(
      screen.getByRole("img", {
        name: /25 % de l’épargne visée atteinte : 500,00\s€ sur 2\s000,00\s€/,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Vélo")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ajouter un objectif" })
    ).toHaveAttribute("href", "/objectifs-evenements");
  });

  it("shows empty states for expenses and goals", () => {
    useHomeBudget.mockReturnValue(
      state({ expenses: section([]), goals: section(null) })
    );
    renderHome();

    expect(
      screen.getByText(
        "Vous n’avez pas encore renseigné de dépense ce mois-ci."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Vous n’avez pas encore d’objectif.")
    ).toBeInTheDocument();
  });

  it("shows loading and independent error states with retry", () => {
    const failed = section(null, "error");
    useHomeBudget.mockReturnValue(
      state({ summary: section(null, "loading"), goals: failed })
    );
    renderHome();

    expect(screen.getByRole("status", { name: "" }).textContent).toBe(
      "Chargement du reste à vivre…"
    );
    expect(screen.getByText("Loisirs")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Les objectifs n’ont pas pu être chargés.");
    fireEvent.click(within(alert).getByRole("button", { name: "Réessayer" }));
    expect(failed.reload).toHaveBeenCalledTimes(1);
  });
});

describe("Home reste à vivre at the end of the month", () => {
  it("names the capped week and explains the limit", () => {
    useHomeBudget.mockReturnValue(
      state({ summary: section(summary({ remainingDays: 1 })) })
    );
    renderHome();

    fireEvent.click(screen.getByLabelText("Semaine"));

    expect(
      screen.getByRole("heading", { name: "Reste à vivre sur 1 jour" })
    ).toBeInTheDocument();
    expect(mainAmount()).toBe("63,96 €");
    expect(
      screen.getByText(/La semaine est limitée aux jours restants du mois/)
    ).toBeInTheDocument();
  });
});

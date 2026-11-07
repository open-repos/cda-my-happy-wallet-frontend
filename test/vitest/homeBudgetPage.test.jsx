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
import { captureLiveRegions, expectAnnouncedIn } from "./liveRegions";

vi.mock("../../src/js/hooks/useHomeBudget", () => ({
  HOME_CURRENCY: "EUR",
  useHomeBudget: vi.fn(),
}));

// jsdom n'a pas de canvas : le graphique expose son option pour les assertions.
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ option, label }) => (
    <div
      role="img"
      aria-label={label}
      data-series={option.series.map((serie) => serie.type).join(",")}
    />
  ),
}));

const summary = (overrides = {}) => ({
  month: "2026-10",
  currency: "EUR",
  base: "1200.00",
  actualIncome: "0.00",
  actualExpense: "42.50",
  realRemaining: "1037.50",
  carryIn: "-120.00",
  carryFromMonth: "2026-09",
  monthResult: "1157.50",
  remainingDays: 12,
  realDailyAllowance: "86.46",
  forecast: {
    plannedIncome: "0.00",
    plannedExpense: "120.00",
    goalSavings: "150.00",
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
  normalize(document.querySelector(".home-budget__amount-current").textContent);

beforeEach(() => useHomeBudget.mockReturnValue(state()));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Home reste à vivre", () => {
  it("shows the updated and theoretical month values with a distinct carry line", () => {
    renderHome();

    expect(
      screen.getByRole("heading", { name: "Reste à vivre du mois" })
    ).toBeInTheDocument();
    expect(mainAmount()).toBe("767,50 €");
    expect(
      document.querySelector(".home-budget__amount-theoretical")
    ).toHaveTextContent(/1\s200,00\s€/);
    expect(screen.getByText(/432,50 € de moins ce mois-ci/)).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAccessibleName(
      /reste à vivre actualisé 767,50\s*€ sur 1\s*200,00\s*€ théorique/i
    );
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
    expect(
      document.querySelector(".home-budget__amount-theoretical")
    ).toHaveTextContent(/270,97\s€/);
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
    expect(screen.getByText(/58,71\s*€ de moins par jour/)).toBeVisible();
    expect(
      screen.getByText(/effort nécessaire pour finir le mois à l’équilibre/)
    ).toBeInTheDocument();
  });

  it("describes an actualized amount above the theoretical without relying on color", () => {
    useHomeBudget.mockReturnValue(
      state({
        summary: section(
          summary({
            base: "500.00",
            forecast: {
              plannedIncome: "0.00",
              plannedExpense: "120.00",
              goalSavings: "150.00",
              forecastRemaining: "767.50",
              prudentDailyAllowance: "63.96",
            },
          })
        ),
      })
    );
    renderHome();

    expect(screen.getByText(/267,50\s*€ de plus ce mois-ci/)).toBeVisible();
  });

  it("shows this month's side-by-side values and opens an exact calculation detail", () => {
    renderHome();

    const monthCard = screen.getByRole("group", { name: "Ce mois-ci" });
    expect(within(monthCard).getByText("Actualisé")).toBeVisible();
    expect(within(monthCard).getByText(/767,50\s€/)).toBeVisible();
    expect(within(monthCard).getByText("Théorique")).toBeVisible();
    expect(within(monthCard).getByText(/1\s200,00\s€/)).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Voir le détail du calcul" })
    );
    const detail = screen.getByRole("dialog", { name: "Détail du calcul" });
    expect(within(detail).getByText("Reste à vivre théorique")).toBeVisible();
    expect(within(detail).getByText("Dépenses déjà faites")).toBeVisible();
    expect(within(detail).getByText("Dépenses prévues")).toBeVisible();
    expect(within(detail).getByText("Épargne des objectifs")).toBeVisible();
    expect(within(detail).getByText("Reste à vivre actualisé")).toBeVisible();
    expect(within(detail).getByText(/767,50\s€/)).toBeVisible();
  });

  it("renders the expense chart with a textual equivalent per category", () => {
    renderHome();

    const chart = screen.getByRole("list", { name: "Dépenses par catégorie" });
    const rows = within(chart).getAllByRole("listitem");
    expect(rows.map((row) => normalize(row.textContent))).toEqual([
      "Loisirs : 60,00 €",
      "Alimentation : 42,80 €",
    ]);
    const graph = screen.getByRole("img", {
      name: /Graphique des dépenses du mois par catégorie, 2 catégories/,
    });
    expect(graph).toHaveAttribute("data-series", "bar");

    fireEvent.click(screen.getByLabelText("Secteurs"));

    expect(
      screen.getByRole("img", { name: /Graphique des dépenses/ })
    ).toHaveAttribute("data-series", "pie");
    expect(
      screen.getByRole("link", { name: "Ajouter une dépense" })
    ).toHaveAttribute("href", "/operations");
    expect(
      screen.getByRole("link", { name: "Explorer mes dépenses" })
    ).toHaveAttribute(
      "href",
      "/analyses?metric=expense&groupBy=category&splitBy=none&chart=pie&period=month"
    );
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

    expect(screen.getByText("Chargement du reste à vivre…")).toBeVisible();
    expect(screen.getByText(/^Loisirs :/)).toBeInTheDocument();
    const goals = screen.getByRole("article", { name: "Mes objectifs" });
    expect(
      within(goals).getByText("Les objectifs n’ont pas pu être chargés.")
    ).toBeVisible();
    fireEvent.click(within(goals).getByRole("button", { name: "Réessayer" }));
    expect(failed.reload).toHaveBeenCalledTimes(1);
  });

  it("announces each block in live regions mounted beforehand (#164)", async () => {
    const { rerender } = renderHome();
    const captured = captureLiveRegions();
    const rerenderHome = () =>
      rerender(
        <MemoryRouter>
          <CaseShowRaV />
        </MemoryRouter>
      );

    useHomeBudget.mockReturnValue(
      state({
        summary: section(null, "loading"),
        expenses: section(null, "loading"),
        goals: section(null, "error"),
      })
    );
    rerenderHome();
    await expectAnnouncedIn(captured, "status", "Chargement du reste à vivre…");
    await expectAnnouncedIn(captured, "status", "Chargement des dépenses…");
    await expectAnnouncedIn(
      captured,
      "alert",
      "Les objectifs n’ont pas pu être chargés."
    );

    useHomeBudget.mockReturnValue(
      state({
        summary: section(null, "error"),
        expenses: section(null, "error"),
      })
    );
    rerenderHome();
    await expectAnnouncedIn(
      captured,
      "alert",
      "Le reste à vivre n’a pas pu être chargé."
    );
    await expectAnnouncedIn(
      captured,
      "alert",
      "Les dépenses du mois n’ont pas pu être chargées."
    );

    // Retour au succès : mêmes régions, vidées.
    useHomeBudget.mockReturnValue(state());
    rerenderHome();
    expect(captureLiveRegions()).toEqual(captured);
    for (const region of captured) expect(region).toBeEmptyDOMElement();
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

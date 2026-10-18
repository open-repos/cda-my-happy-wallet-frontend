import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Analyses from "../../src/js/pages/Analyses";
import { useAnalytics } from "../../src/js/hooks/useAnalytics";

vi.mock("../../src/js/hooks/useAnalytics", () => ({ useAnalytics: vi.fn() }));
// Les rangs de palette ont leur propre test (#172).
vi.mock("../../src/js/hooks/useCategoryRanks", () => ({
  useCategoryRanks: vi.fn(() => ({ ranks: null, settled: true })),
}));
// jsdom n'a pas de canvas : le graphique expose son type de série.
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ option, label }) => (
    <div
      role="img"
      aria-label={label}
      data-series={option.series.map((serie) => serie.type).join(",")}
    />
  ),
}));

const totals = (key, expense, extra = {}) => ({
  key,
  label: null,
  color: null,
  income: "0.00",
  expense,
  net: `-${expense}`,
  count: 1,
  ...extra,
});

const result = (overrides = {}) => ({
  status: "success",
  data: {
    currency: "EUR",
    from: "2026-09-01",
    to: "2026-10-31",
    groupBy: "month",
    splitBy: null,
    kind: "DEPENSE",
    buckets: [totals("2026-09", "40.00"), totals("2026-10", "12.50")],
  },
  reload: vi.fn(),
  ...overrides,
});

const Location = () => (
  <>
    <span data-testid="search">{useLocation().search}</span>
    <span data-testid="navigation">{useNavigationType()}</span>
  </>
);

const renderAt = (search) =>
  render(
    <MemoryRouter initialEntries={[`/analyses${search}`]}>
      <Routes>
        <Route
          path="/analyses"
          element={
            <>
              <Analyses />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

const params = () =>
  new URLSearchParams(screen.getByTestId("search").textContent);
const normalize = (text) => text.replace(/\s/g, " ");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Analyses", () => {
  it("renders the chart and an accessible table from the URL choices", () => {
    useAnalytics.mockReturnValue(result());
    renderAt("?metric=expense&groupBy=month&splitBy=none&chart=bar&period=3m");

    expect(
      screen.getByRole("heading", { name: "Analyses" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Regrouper par")).toHaveValue("month");
    expect(
      screen.getByRole("img", { name: /^Graphique en barres : dépenses du/ })
    ).toHaveAttribute("data-series", "bar");
    const table = screen.getByRole("table", { name: "Dépenses par mois" });
    expect(
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => normalize(row.textContent))
    ).toEqual(["sept. 202640,00 €", "oct. 202612,50 €"]);
    expect(
      screen.getByRole("region", { name: "Dépenses par mois" })
    ).toHaveAttribute("tabindex", "0");
    expect(useAnalytics).toHaveBeenLastCalledWith(
      expect.objectContaining({ groupBy: "month", kind: "DEPENSE" }),
      null
    );
  });

  it("writes every choice to the URL and offers only relevant chart types", () => {
    useAnalytics.mockReturnValue(result());
    renderAt("");

    expect(screen.getByLabelText("Type de graphique")).toHaveValue("pie");
    expect(screen.queryByLabelText("Ventiler")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Regrouper par"), {
      target: { value: "week" },
    });
    expect(params().get("groupBy")).toBe("week");
    expect(params().get("chart")).toBe("bar");

    // « Par type » n'a de sens que pour le solde net.
    const splits = () =>
      within(screen.getByLabelText("Ventiler"))
        .getAllByRole("option")
        .map((option) => option.textContent);
    expect(splits()).toEqual(["Aucune", "Par catégorie"]);
    fireEvent.change(screen.getByLabelText("Indicateur"), {
      target: { value: "net" },
    });
    expect(splits()).toEqual(["Aucune", "Par catégorie", "Par type"]);
    fireEvent.change(screen.getByLabelText("Ventiler"), {
      target: { value: "kind" },
    });
    expect(params().get("chart")).toBe("stacked");
    const chartTypes = within(screen.getByLabelText("Type de graphique"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(chartTypes).toEqual(["Barres empilées", "Lignes", "Aires"]);

    expect(params().get("metric")).toBe("net");
  });

  it("switches to a custom period with date fields", () => {
    useAnalytics.mockReturnValue(result());
    renderAt("?groupBy=day&chart=line&period=month");

    fireEvent.change(screen.getByLabelText("Période"), {
      target: { value: "custom" },
    });
    expect(params().get("period")).toBe("custom");
    expect(screen.getByTestId("navigation").textContent).toBe("PUSH");
    fireEvent.change(screen.getByLabelText("Du"), {
      target: { value: "2026-01-01" },
    });
    expect(params().get("from")).toBe("2026-01-01");
    // Une saisie de date remplace l'entrée d'historique.
    expect(screen.getByTestId("navigation").textContent).toBe("REPLACE");
  });

  it("explains a range the API would refuse without calling it", () => {
    useAnalytics.mockImplementation((_, problem) => ({
      status: "invalid",
      message: problem,
      reload: vi.fn(),
    }));
    renderAt(
      "?groupBy=day&chart=bar&period=custom&from=2025-01-01&to=2026-06-30"
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/366 jours au plus/);
  });

  it("shows loading, empty and coded error states with retry", () => {
    useAnalytics.mockReturnValue(result({ status: "loading", data: null }));
    const { rerender } = renderAt("?groupBy=month&chart=bar");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement du graphique"
    );

    useAnalytics.mockReturnValue(result({ status: "empty", data: null }));
    rerender(
      <MemoryRouter initialEntries={["/analyses"]}>
        <Analyses />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Aucune opération sur cette période.")
    ).toBeInTheDocument();

    const failed = result({
      status: "error",
      data: null,
      code: "ANALYTICS_RANGE_TOO_LARGE",
    });
    useAnalytics.mockReturnValue(failed);
    rerender(
      <MemoryRouter initialEntries={["/analyses"]}>
        <Analyses />
      </MemoryRouter>
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Trop de points/);
    // Un refus métier se reproduirait : pas de relance proposée.
    expect(
      screen.queryByRole("button", { name: "Réessayer" })
    ).not.toBeInTheDocument();

    const offline = result({ status: "error", data: null, code: null });
    useAnalytics.mockReturnValue(offline);
    rerender(
      <MemoryRouter initialEntries={["/analyses"]}>
        <Analyses />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(offline.reload).toHaveBeenCalledTimes(1);
  });

  it("uses the table as the pie legend with swatches and shares", () => {
    useAnalytics.mockReturnValue(
      result({
        data: {
          ...result().data,
          groupBy: "category",
          buckets: [
            totals("7", "60.00", { label: "Loisirs" }),
            totals("4", "40.00", { label: "Alimentation", color: "#55AA22" }),
          ],
        },
      })
    );
    renderAt("?groupBy=category&chart=pie");

    const table = screen.getByRole("table", { name: "Dépenses par catégorie" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent)
    ).toEqual(["Catégorie", "Dépenses", "Part"]);
    expect(
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => normalize(row.textContent))
    ).toEqual(["Loisirs60,00 €60 %", "Alimentation40,00 €40 %"]);
    expect(
      table.querySelectorAll(".analytics-table__swatch")[1].style
        .backgroundColor
    ).toBe("rgb(85, 170, 34)");
  });

  it("splits the table by series with a total column", () => {
    const split = (key, food, leisure) => ({
      ...totals(key, "0.00"),
      series: [
        totals("7", leisure, { label: "Loisirs" }),
        totals("4", food, { label: "Alimentation" }),
      ],
    });
    useAnalytics.mockReturnValue(
      result({
        data: {
          ...result().data,
          splitBy: "category",
          buckets: [split("2026-10", "12.50", "40.00")],
        },
      })
    );
    renderAt("?groupBy=month&splitBy=category&chart=stacked");

    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent)
    ).toEqual(["Mois", "Loisirs", "Alimentation", "Total"]);
  });
});

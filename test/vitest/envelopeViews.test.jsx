import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiPrivate } from "../../src/utils/axiosHelper";
import { EnvelopeSection } from "../../src/js/components/Envelopes/EnvelopeSection";
import { RemainingToLive } from "../../src/js/components/HomeBudget/RemainingToLive";
import { parseBudgetSummary } from "../../src/js/services/budgetService";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { envelopeMonth } from "../../src/js/utils/envelopes";
import {
  envelopeCategoryAnalysis,
  envelopeMeta,
  envelopeOccurrence,
  envelopeOverview,
  envelopePayments,
} from "../fixtures/envelopes.mjs";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const month = envelopeMonth();
let actual, rows, fail, associationConflict;
const show = (analysis = false) =>
  render(
    <MemoryRouter>
      <SimulationProvider>
        <EnvelopeSection analysis={analysis} />
      </SimulationProvider>
    </MemoryRouter>
  );
beforeEach(() => {
  actual = "223.00";
  rows = envelopePayments(month);
  fail = false;
  associationConflict = false;
  vi.resetAllMocks();
  apiPrivate.get.mockImplementation(async (path, config) => {
    if (fail) throw new Error("offline");
    if (path === "/envelope-overview")
      return {
        data: {
          data:
            config.params.currency === "USD"
              ? []
              : [envelopeOverview({ month, actual })],
          meta: envelopeMeta,
        },
      };
    if (path === "/envelope-analytics")
      return { data: { data: [envelopeCategoryAnalysis], meta: envelopeMeta } };
    if (path === "/reconciliation/occurrences/41")
      return { data: { data: envelopeOccurrence({ month, actual }) } };
    if (path === "/reconciliation/occurrences/41/operations")
      return {
        data: {
          data: config.params.unassociated
            ? [{ ...rows[0], id: 7, title: "Épicerie", occurrenceId: null }]
            : rows,
          meta: envelopeMeta,
        },
      };
    throw new Error(`Unexpected ${path}`);
  });
  apiPrivate.put.mockImplementation(async (_, body) => {
    if (associationConflict)
      throw {
        response: {
          data: { error: { details: { code: "ASSOCIATION_CONFLICT" } } },
        },
      };
    if (body.occurrenceId === null) rows = rows.filter((r) => r.id !== 1);
    return {};
  });
});
afterEach(cleanup);
describe("integrated envelope cards and monthly detail", () => {
  it("displays the authoritative 800 balance for a 300 envelope with 400 actual, without adding the included adjustment", () => {
    const data = parseBudgetSummary({
      month,
      currency: "EUR",
      status: "OPEN",
      balanceStatus: "POSITIVE",
      revision: 1,
      correctedAt: null,
      fixedIncome: "2000.00",
      fixedExpense: "1100.00",
      base: "900.00",
      carryIn: "0.00",
      carryFromMonth: null,
      actualIncome: "0.00",
      actualExpense: "400.00",
      monthResult: "800.00",
      realRemaining: "800.00",
      reconciliationAdjustment: "300.00",
      remainingDays: 1,
      realDailyAllowance: "800.00",
      unresolvedEvents: 0,
      forecast: null,
      days: [],
    });
    const { container } = render(
      <MemoryRouter>
        <RemainingToLive
          section={{
            status: "success",
            data,
            loadingKey: "integrated",
            reload: vi.fn(),
          }}
          period="mois"
        />
      </MemoryRouter>
    );
    expect(container.querySelector(".home-budget__amount")).toHaveTextContent(
      /^800,00/
    );
    expect(
      screen.getByText("Rapprochement des enveloppes inclus dans le résultat")
    ).toBeVisible();
    expect(data.realRemaining).toBe("800.00");
    expect(data.reconciliationAdjustment).toBe("300.00");
    expect(() =>
      parseBudgetSummary({ ...data, reconciliationAdjustment: 300 })
    ).toThrow();
  });
  it("shows server percentage and remaining, then 111%/+33 after refresh, never 633", async () => {
    show();
    const card = await screen.findByRole("article", { name: "Alimentation" });
    expect(card).toHaveTextContent(/74,33 %/);
    expect(card).toHaveTextContent(/77,00/);
    actual = "333.00";
    fireEvent.focus(window);
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Alimentation" })
      ).toHaveTextContent(/111 %/)
    );
    expect(
      screen.getByRole("article", { name: "Alimentation" })
    ).toHaveTextContent(/Dépassement de 33,00/);
    expect(
      screen.getByRole("article", { name: "Alimentation" })
    ).not.toHaveTextContent(/633/);
  });
  it("keeps month context after opening payments and unlinks without a delete", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Voir les dépenses (3)" })
    );
    const detail = await screen.findByRole("region", {
      name: "Détail de l’enveloppe",
    });
    await within(detail).findByText("Carrefour");
    fireEvent.click(
      within(detail).getAllByRole("button", {
        name: "Dissocier",
        exact: true,
      })[0]
    );
    await waitFor(() =>
      expect(apiPrivate.put).toHaveBeenCalledWith(
        "/operations/1/reconciliation",
        { occurrenceId: null, expectedOccurrenceId: 41 },
        { withCredentials: true }
      )
    );
    expect(apiPrivate.delete).not.toHaveBeenCalled();
    fireEvent.click(
      within(detail).getByRole("button", { name: "Retour aux enveloppes" })
    );
    expect(screen.getByLabelText("Mois des enveloppes")).toHaveValue(month);
  });
  it("associates an existing eligible operation and exposes concurrent-state errors without deleting it", async () => {
    show();
    fireEvent.click(
      await screen.findByRole("button", { name: "Voir les dépenses (3)" })
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Associer une opération existante",
      })
    );
    await screen.findByText("Épicerie");
    associationConflict = true;
    fireEvent.click(
      screen.getByRole("button", { name: "Associer", exact: true })
    );
    await screen.findAllByText(/Le rattachement a changé entre-temps/);
    expect(apiPrivate.put).toHaveBeenCalledWith(
      "/operations/7/reconciliation",
      { occurrenceId: 41, expectedOccurrenceId: null },
      { withCredentials: true }
    );
    expect(apiPrivate.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Épicerie")).toBeVisible();
  });
  it("switches year and currency with isolated queries and no sum of an incomplete page", async () => {
    show();
    await screen.findByRole("article", { name: "Alimentation" });
    fireEvent.change(screen.getByLabelText("Afficher"), {
      target: { value: "year" },
    });
    await waitFor(() =>
      expect(apiPrivate.get).toHaveBeenCalledWith(
        "/envelope-overview",
        expect.objectContaining({
          params: { year: month.slice(0, 4), currency: "EUR", limit: 20 },
        })
      )
    );
    expect(
      await screen.findByText(/Somme des dépassements mensuels/)
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Devise des enveloppes"), {
      target: { value: "USD" },
    });
    await screen.findByText(/Aucune enveloppe suivie/);
    expect(
      screen.queryByRole("article", { name: "Alimentation" })
    ).not.toBeInTheDocument();
  });
  it("provides retry after an API error and excludes ordinary charges/income from this view", async () => {
    fail = true;
    show();
    await screen.findByRole("button", { name: "Réessayer les enveloppes" });
    fail = false;
    fireEvent.click(
      screen.getByRole("button", { name: "Réessayer les enveloppes" })
    );
    await screen.findByRole("article", { name: "Alimentation" });
    expect(
      apiPrivate.get.mock.calls.some(([path]) =>
        path.includes("operations-fixes/charges")
      )
    ).toBe(false);
  });
  it("shows real averages and the sample policy by category with the selected horizon", async () => {
    show(true);
    await screen.findByText(/325,00/);
    expect(screen.getByText(/Budget dépassé 4 mois sur 6/)).toBeVisible();
    expect(screen.getByText(/6 mois analysés/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Moyennes sur"), {
      target: { value: "12" },
    });
    await waitFor(() =>
      expect(
        apiPrivate.get.mock.calls.filter(
          ([path]) => path === "/envelope-analytics"
        )
      ).toHaveLength(2)
    );
    expect(
      screen.getByText(/Seules les dépenses rattachées sont observées/)
    ).toBeVisible();
  });
});

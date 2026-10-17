import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Calendrier from "../../src/js/pages/Calendrier";
import { useBudgetCalendar } from "../../src/js/hooks/useBudgetCalendar";
import { useMonthlyEvents } from "../../src/js/hooks/useMonthlyEvents";

vi.mock("../../src/js/hooks/useBudgetCalendar", () => ({
  useBudgetCalendar: vi.fn(),
}));
vi.mock("../../src/js/hooks/useMonthlyEvents", () => ({
  useMonthlyEvents: vi.fn(),
}));

const month = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
}).format(new Date());
const previousMonth = (() => {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
})();

const summary = (overrides = {}) => ({
  month,
  currency: "EUR",
  status: "OPEN",
  revision: 1,
  correctedAt: null,
  balanceStatus: "POSITIVE",
  fixedIncome: "2000.00",
  fixedExpense: "800.00",
  base: "1200.00",
  carryIn: "-120.00",
  carryFromMonth: previousMonth,
  actualIncome: "0.00",
  actualExpense: "40.00",
  monthResult: "1160.00",
  realRemaining: "1040.00",
  remainingDays: 10,
  realDailyAllowance: "104.00",
  unresolvedEvents: 1,
  forecast: {
    plannedIncome: "0.00",
    plannedExpense: "300.00",
    goalSavings: "150.00",
    forecastRemaining: "590.00",
    prudentDailyAllowance: "59.00",
    unresolvedCount: 1,
    overdueCount: 1,
  },
  days: [
    {
      date: `${month}-02`,
      income: "0.00",
      expense: "40.00",
      realRemaining: "1040.00",
      plannedIncome: "0.00",
      plannedExpense: "0.00",
      plannedCount: 0,
      forecastRemaining: "890.00",
    },
  ],
  ...overrides,
});

const occurrence = {
  eventId: 8,
  occurrenceDate: `${month}-01`,
  title: "Loyer",
  amount: "300.00",
  currency: "EUR",
  kind: "DEPENSE",
  overdue: true,
};

const actions = {
  retry: vi.fn(),
  loadMoreOperations: vi.fn(),
  createOperation: vi.fn().mockResolvedValue(true),
  realizeOccurrence: vi.fn().mockResolvedValue(true),
  cancelOccurrence: vi.fn().mockResolvedValue(true),
};

const state = (overrides = {}) => ({
  summary: summary(),
  summaryStatus: "success",
  pending: [occurrence],
  categories: [
    { id: 3, name: "Logement", color: "#275DAD", icon: "solid:house" },
  ],
  operations: [
    {
      id: 1,
      title: "Courses",
      amount: "40.00",
      currency: "EUR",
      type: "DEPENSE",
      operationDate: `${month}-02`,
      categoryId: 3,
    },
  ],
  operationsMeta: { limit: 20, hasNext: false, nextCursor: null },
  operationsStatus: "success",
  mutationStatus: "idle",
  message: { tone: "info", text: "" },
  ...actions,
  ...overrides,
});

const text = (element) => element.textContent.replace(/\s/g, " ");

beforeEach(() => {
  Object.values(actions).forEach((action) => action.mockClear());
  window.localStorage.clear();
  useBudgetCalendar.mockReturnValue(state());
  useMonthlyEvents.mockReturnValue({ occurrences: [] });
});
afterEach(cleanup);

describe("budget calendar page", () => {
  it("shows the carry on its own named line and explains it", () => {
    render(<Calendrier />);
    const real = screen
      .getByRole("heading", { name: "Reste réel" })
      .closest("article");
    const carryRow = within(real)
      .getByText(/^Report d/)
      .closest("div");
    expect(text(carryRow)).toMatch(/[−-]120,00 €/);
    expect(text(real)).toMatch(/Résultat du mois\s*\+1 160,00 €/);
    expect(text(real)).toMatch(/Le déficit d.* est déduit de ce mois/);
    const forecast = screen
      .getByRole("heading", { name: "Reste prévisionnel" })
      .closest("article");
    expect(text(forecast)).toMatch(/Épargne pour vos objectifs\s*[−-]150,00 €/);
    expect(text(forecast)).toMatch(/1 événement en retard/);
  });

  it("hides the carry line for the first tracked month", () => {
    useBudgetCalendar.mockReturnValue(
      state({ summary: summary({ carryFromMonth: null, carryIn: "0.00" }) })
    );
    render(<Calendrier />);
    expect(screen.queryByText(/^Report d/)).not.toBeInTheDocument();
  });

  it("presents a corrected closed month as a balance", () => {
    useBudgetCalendar.mockReturnValue(
      state({
        summary: summary({
          status: "CLOSED",
          forecast: null,
          remainingDays: 0,
          correctedAt: "2026-10-11T08:00:00.000Z",
        }),
      })
    );
    render(<Calendrier />);
    expect(
      screen.getByRole("heading", { name: /^Bilan d/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Positif")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Bilan corrigé le 11 octobre 2026/
    );
    expect(
      screen.getByText(/1 événement de ce mois n’a pas été traité/)
    ).toBeInTheDocument();
  });

  it("explains future months and recovers from errors", () => {
    useBudgetCalendar.mockReturnValue(
      state({ summary: null, summaryStatus: "future" })
    );
    const { rerender } = render(<Calendrier />);
    expect(
      screen.getByText(/sera calculé à l’ouverture du mois/)
    ).toBeInTheDocument();
    useBudgetCalendar.mockReturnValue(
      state({ summary: null, summaryStatus: "error" })
    );
    rerender(<Calendrier />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(actions.retry).toHaveBeenCalledTimes(1);
  });

  it("switches day contents between markers, expenses and forecast", () => {
    render(<Calendrier />);
    const day = screen.getByRole("button", { name: /dépenses 40,00/ });
    expect(within(day).queryByText(/−40/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Dépenses"));
    expect(day).toHaveTextContent("−40");
    expect(window.localStorage.getItem("mhw.calendar.mode")).toBe("expenses");
    fireEvent.click(screen.getByLabelText("Prévisionnel"));
    expect(day).toHaveTextContent("890");
    fireEvent.click(
      screen.getByRole("button", { name: "Masquer les montants" })
    );
    expect(day).not.toHaveTextContent("890");
  });

  it("labels each operation with its category and icon", async () => {
    render(<Calendrier />);
    const row = screen.getByText("Courses").closest("li");
    expect(within(row).getByText("Logement")).toBeInTheDocument();
    // Icône décorative, dessinée dans la couleur de la catégorie.
    const icon = await waitFor(() => {
      const svg = row.querySelector("svg[aria-hidden='true']");
      expect(svg).not.toBeNull();
      return svg;
    });
    expect(icon).toHaveStyle({ color: "#275DAD" });
  });

  it("filters the list by day and returns to the whole month", () => {
    render(<Calendrier />);
    expect(
      screen.getByRole("heading", { name: /^Opérations de / })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dépenses 40,00/ }));
    expect(useBudgetCalendar).toHaveBeenLastCalledWith(month, `${month}-02`);
    fireEvent.click(screen.getByRole("button", { name: "Tout le mois" }));
    expect(useBudgetCalendar).toHaveBeenLastCalledWith(month, null);
  });

  it("converts an overdue occurrence with adjustable values, or cancels it", async () => {
    render(<Calendrier />);
    expect(
      screen.getByRole("heading", { name: "À traiter (1)" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Convertir Loyer/ }));
    fireEvent.change(screen.getByLabelText(/^Montant/), {
      target: { value: "287.90" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer l’opération" })
    );
    await vi.waitFor(() =>
      expect(actions.realizeOccurrence).toHaveBeenCalledWith(occurrence, {
        categoryId: 3,
        title: "Loyer",
        amount: "287.90",
        operationDate: `${month}-01`,
      })
    );
    fireEvent.click(screen.getByRole("button", { name: /^Annuler Loyer/ }));
    expect(actions.cancelOccurrence).toHaveBeenCalledWith(occurrence);
  });
});

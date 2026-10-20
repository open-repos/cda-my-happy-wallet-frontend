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
import UpcomingMonths from "../../src/js/pages/UpcomingMonths";
import { useBudgetForecast } from "../../src/js/hooks/useBudgetForecast";
import { budgetForecast } from "./fixtures/budgetForecast";

vi.mock("../../src/js/hooks/useBudgetForecast", () => ({
  useBudgetForecast: vi.fn(),
}));
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ label }) => <div role="img" aria-label={label} />,
}));
const reload = vi.fn();
const state = { status: "success", data: budgetForecast(), reload };
beforeEach(() => {
  reload.mockClear();
  useBudgetForecast.mockReturnValue(state);
});
afterEach(cleanup);
const show = () =>
  render(
    <MemoryRouter>
      <UpcomingMonths />
    </MemoryRouter>
  );

describe("upcoming months", () => {
  it("offers twelve months by default and exposes all amounts in an equivalent table", () => {
    show();
    expect(
      screen.getByRole("heading", { name: "Prochains mois", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Horizon de prévision" })
    ).toHaveValue("12");
    const table = screen.getByRole("table", { name: "Prévisions mensuelles" });
    expect(
      within(table).getByRole("columnheader", { name: "Entrées prévues" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Épargne des objectifs" })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: "Disponible par semaine",
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Disponible par jour" })
    ).toBeInTheDocument();
    expect(within(table).getByText("Solde négatif")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Reste prévisionnel/ })
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Horizon de prévision" }),
      { target: { value: "6" } }
    );
    expect(useBudgetForecast).toHaveBeenLastCalledWith(
      expect.objectContaining({ months: 6, currency: "EUR" }),
      null
    );
  });

  it("renders loading, empty and retryable failure without presenting stale balances", () => {
    useBudgetForecast.mockReturnValue({
      ...state,
      status: "loading",
      data: null,
    });
    const { rerender } = show();
    expect(screen.getByText("Chargement des prévisions…")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    useBudgetForecast.mockReturnValue({
      ...state,
      status: "empty",
      data: budgetForecast({ months: [] }),
    });
    rerender(
      <MemoryRouter>
        <UpcomingMonths />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Aucune prévision pour cette période.")
    ).toBeInTheDocument();
    useBudgetForecast.mockReturnValue({
      ...state,
      status: "error",
      data: null,
    });
    rerender(
      <MemoryRouter>
        <UpcomingMonths />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});

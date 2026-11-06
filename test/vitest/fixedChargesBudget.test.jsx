vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: { listOccurrences: vi.fn(async () => []) },
}));
vi.mock("../../src/js/services/calendarResolutionsService", () => ({
  listCalendarResolutions: vi.fn(async () => []),
}));
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";
import reducer from "../../src/js/slices/operationsFixes/operationsFixesSlice";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { FixedCharges } from "../../src/js/components/OperationsFixes/FixedCharges";
import { FixedBudgetSummary } from "../../src/js/components/OperationsFixes/FixedBudgetSummary";
import { useHomeBudget } from "../../src/js/hooks/useHomeBudget";
import { useBudgetCalendar } from "../../src/js/hooks/useBudgetCalendar";
import { useBudgetForecast } from "../../src/js/hooks/useBudgetForecast";
import service from "../../src/js/services/operationsFixesService";
import { budgetService } from "../../src/js/services/budgetService";
import { budgetForecastService } from "../../src/js/services/budgetForecastService";
vi.mock("../../src/js/services/operationsFixesService", () => ({
  default: {
    getAllCharges: vi.fn(),
    postCharges: vi.fn(),
    putCharge: vi.fn(),
    deleteCharge: vi.fn(),
  },
}));
vi.mock("../../src/js/services/budgetService", () => ({
  budgetService: { getSummary: vi.fn(), listPending: vi.fn(async () => []) },
  budgetErrorCode: () => null,
}));
vi.mock("../../src/js/services/goalsService", () => ({
  goalsService: { listAllGoals: async () => [] },
}));
vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listAllOperations: async () => [],
    listAllCategories: async () => [],
    listOperations: async () => ({ data: [], meta: { hasNext: false } }),
  },
}));
vi.mock(
  "../../src/js/services/budgetForecastService",
  async (importOriginal) => ({
    ...(await importOriginal()),
    budgetForecastService: { forecast: vi.fn() },
  })
);
const Probe = () => {
  const home = useHomeBudget("2026-10");
  const calendar = useBudgetCalendar("2026-10", null);
  const forecast = useBudgetForecast({
    from: "2026-10",
    months: 3,
    currency: "EUR",
  });
  return (
    <>
      <output data-testid="home">{home.summary.data?.realRemaining}</output>
      <output data-testid="calendar">{calendar.summary?.realRemaining}</output>
      <output data-testid="forecast">
        {forecast.data?.months[0]?.forecastRemaining}
      </output>
    </>
  );
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("budgets serveur après mutation d’une charge", () => {
  it("recharge accueil, calendrier et prochains mois après création, édition, suppression sans deuxième déduction", async () => {
    let rows = [],
      expense = "0.00";
    service.getAllCharges.mockImplementation(async () => ({
      data: { data: rows },
    }));
    service.postCharges.mockImplementation(async (body) => {
      expense = "5.00";
      rows = [
        {
          ...body,
          idOperationFixe: 7,
          montantPersonnel: "60.00",
          montantMensuelPersonnel: "5.00",
        },
      ];
    });
    service.putCharge.mockImplementation(async (id, body) => {
      expense = "4.00";
      rows = [
        {
          ...body,
          idOperationFixe: id,
          montantPersonnel: "48.00",
          montantMensuelPersonnel: "4.00",
        },
      ];
    });
    service.deleteCharge.mockImplementation(async () => {
      expense = "0.00";
      rows = [];
    });
    // Le montant serveur inclut d'autres opérations/reports : impossible de
    // le reconstruire correctement à partir de la liste des charges seulement.
    const remaining = () =>
      expense === "5.00" ? "873.42" : expense === "4.00" ? "874.42" : "878.42";
    budgetService.getSummary.mockImplementation(async () => ({
      realRemaining: remaining(),
      fixedExpense: expense,
    }));
    budgetForecastService.forecast.mockImplementation(async () => ({
      months: [{ forecastRemaining: remaining() }],
    }));
    render(
      <Provider
        store={configureStore({ reducer: { operationsFixes: reducer } })}
      >
        <SimulationProvider>
          <FixedCharges />
          <FixedBudgetSummary />
          <Probe />
        </SimulationProvider>
      </Provider>
    );
    const expectAll = async (value) => {
      for (const id of ["home", "calendar", "forecast"])
        await waitFor(() =>
          expect(screen.getByTestId(id)).toHaveTextContent(value)
        );
      expect(
        screen.getByRole("region", { name: "Reste à vivre du mois en euros" })
      ).toHaveTextContent(value.replace(".", ","));
    };
    await expectAll("878.42");
    fireEvent.click(screen.getByRole("button", { name: "Ajouter une charge" }));
    for (const [label, value] of [
      ["Titre de la charge", "Abonnement"],
      ["Montant total par échéance", "120"],
      ["Périodicité", "ANNUELLE"],
      ["Ma part de la charge (%)", "50"],
    ])
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await expectAll("873.42");
    fireEvent.click(
      await screen.findByRole("button", { name: "Modifier Abonnement" })
    );
    fireEvent.change(screen.getByLabelText("Ma part de la charge (%)"), {
      target: { value: "40" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la charge" })
    );
    await expectAll("874.42");
    fireEvent.click(
      await screen.findByRole("button", { name: "Supprimer Abonnement" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmer la suppression" })
    );
    await expectAll("878.42");
  });
});

import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { SimulationPanel } from "../../src/js/components/Simulation/SimulationPanel";
import { usePotentialEvents } from "../../src/js/hooks/usePotentialEvents";
import { useSimulationComparison } from "../../src/js/hooks/useSimulationComparison";
import { monthlyEventsService } from "../../src/js/services/monthlyEventsService";
import { budgetForecast, forecastMonth } from "./fixtures/budgetForecast";
vi.mock("../../src/js/hooks/usePotentialEvents", () => ({
  usePotentialEvents: vi.fn(),
}));
vi.mock("../../src/js/hooks/useSimulationComparison", () => ({
  useSimulationComparison: vi.fn(),
}));
vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: {
    confirmPotentialEvent: vi.fn(),
    deleteEvent: vi.fn(),
    clearPotentialEvents: vi.fn(),
    updateEvent: vi.fn(),
  },
}));
const event = {
  id: 8,
  title: "Voyage",
  amount: "300.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: "2026-10-24",
  recurrence: "AUCUNE",
  endDate: null,
  status: "POTENTIEL",
};
beforeEach(() => {
  vi.resetAllMocks();
  usePotentialEvents.mockReturnValue({
    status: "success",
    events: [event],
    reload: vi.fn(),
  });
  useSimulationComparison.mockReturnValue({
    status: "success",
    standard: budgetForecast({ months: [forecastMonth()] }),
    simulation: budgetForecast({
      months: [forecastMonth({ forecastRemaining: "400.00" })],
    }),
  });
});
afterEach(cleanup);
const show = () =>
  render(
    <SimulationProvider>
      <SimulationPanel month="2026-10" />
    </SimulationProvider>
  );
it("keeps numbers standard until explicitly enabled and describes potential expiry", () => {
  show();
  expect(screen.getByRole("switch", { name: "Simulation" })).not.toBeChecked();
  expect(screen.getByText(/1 novembre 2026/)).toBeVisible();
  expect(screen.getByText("Potentiel", { exact: true })).toBeVisible();
  expect(screen.queryByText(/Avec la Simulation/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("switch", { name: "Simulation" }));
  expect(screen.getByText(/Avec la Simulation/)).toBeVisible();
});
it("requires confirmation, supports cancellation and restores keyboard focus", async () => {
  show();
  const opener = screen.getByRole("button", { name: "Confirmer Voyage" });
  fireEvent.click(opener);
  expect(monthlyEventsService.confirmPotentialEvent).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Annuler la confirmation" })
  ).toHaveFocus();
  fireEvent.click(
    screen.getByRole("button", { name: "Annuler la confirmation" })
  );
  expect(opener).toHaveFocus();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole("button", { name: "Oui, confirmer" }));
  await waitFor(() =>
    expect(monthlyEventsService.confirmPotentialEvent).toHaveBeenCalledWith(8)
  );
});
it("confirms individual deletion and clearing separately", async () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Supprimer Voyage" }));
  expect(monthlyEventsService.deleteEvent).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Oui, supprimer" }));
  await waitFor(() =>
    expect(monthlyEventsService.deleteEvent).toHaveBeenCalledWith(8)
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Oui, supprimer" })
    ).not.toBeInTheDocument()
  );
  fireEvent.click(screen.getByRole("button", { name: "Vider la simulation" }));
  expect(monthlyEventsService.clearPotentialEvents).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Oui, vider la simulation" })
  );
  await waitFor(() =>
    expect(monthlyEventsService.clearPotentialEvents).toHaveBeenCalledOnce()
  );
});
it("opens potential editing with its date and preserves potential status through the API", async () => {
  show();
  fireEvent.click(screen.getByRole("button", { name: "Modifier Voyage" }));
  expect(screen.getByLabelText("Titre")).toHaveValue("Voyage");
  fireEvent.change(screen.getByLabelText(/^Montant/), {
    target: { value: "250.00" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer", exact: true })
  );
  await waitFor(() =>
    expect(monthlyEventsService.updateEvent).toHaveBeenCalledWith(
      8,
      expect.objectContaining({ amount: "250.00", startDate: "2026-10-24" })
    )
  );
});

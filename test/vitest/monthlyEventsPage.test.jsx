import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render as renderComponent,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Calendrier from "../../src/js/pages/Calendrier";
import Objectifs from "../../src/js/pages/Objectifs";
import { useMonthlyEvents } from "../../src/js/hooks/useMonthlyEvents";
import { captureLiveRegions, expectAnnouncedIn } from "./liveRegions";
import { useBudgetCalendar } from "../../src/js/hooks/useBudgetCalendar";
import { useFinancialGoals } from "../../src/js/hooks/useFinancialGoals";
const render = (ui) => renderComponent(ui, { wrapper: MemoryRouter });

// Objectifs also mounts the financial goals section. Its hook and UI have
// dedicated suites; keep this page test independent from the real API.
vi.mock("../../src/js/hooks/useFinancialGoals", () => ({
  useFinancialGoals: vi.fn(),
}));
vi.mock(
  "../../src/js/components/FinancialGoals/SavingsCapacitySection",
  () => ({
    SavingsCapacitySection: () => null,
  })
);

vi.mock("../../src/js/hooks/useMonthlyEvents", () => ({
  useMonthlyEvents: vi.fn(),
}));
vi.mock("../../src/js/hooks/useBudgetCalendar", () => ({
  useBudgetCalendar: vi.fn(),
}));

const event = {
  id: 4,
  title: "Assurance",
  amount: "120.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: "2026-09-20",
  recurrence: "MENSUELLE",
  endDate: null,
};
const actions = {
  retry: vi.fn(),
  createEvent: vi.fn().mockResolvedValue(true),
  updateEvent: vi.fn().mockResolvedValue(true),
  deleteEvent: vi.fn().mockResolvedValue(true),
};
const state = {
  events: [event],
  occurrences: [],
  status: "success",
  mutationStatus: "idle",
  message: "",
  ...actions,
};

beforeEach(() => {
  Object.values(actions).forEach((action) => action.mockClear());
  useMonthlyEvents.mockReturnValue(state);
  useFinancialGoals.mockReturnValue({
    goals: [],
    status: "success",
    mutationStatus: "idle",
    message: "",
    retry: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
  });
});
afterEach(cleanup);

describe("monthly event pages", () => {
  it("renders without sending a real HTTP request", async () => {
    const send = vi
      .spyOn(XMLHttpRequest.prototype, "send")
      .mockImplementation(() => {
        throw new Error("Unexpected HTTP request in a unit test");
      });
    try {
      await act(async () => render(<Objectifs />));
      expect(useFinancialGoals).toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    } finally {
      cleanup();
      send.mockRestore();
    }
  });

  it("renders the event list and submits an accessible recurring event form", async () => {
    render(<Objectifs />);
    expect(
      screen.getByRole("heading", { name: "Événements mensuels" })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter un événement" })
    );
    fireEvent.change(screen.getByLabelText("Titre"), {
      target: { value: "Salaire" },
    });
    fireEvent.change(screen.getByLabelText(/^Montant/), {
      target: { value: "1800" },
    });
    fireEvent.change(screen.getByLabelText("Date de début"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Récurrence"), {
      target: { value: "MENSUELLE" },
    });
    fireEvent.click(screen.getByLabelText("Entrée"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(actions.createEvent).toHaveBeenCalledWith({
      title: "Salaire",
      amount: "1800",
      currency: "EUR",
      kind: "ENTREE",
      startDate: "2026-10-01",
      recurrence: "MENSUELLE",
      endDate: null,
    });
  });

  it("marks planned occurrences of a future month and changes month", () => {
    const today = new Date().toISOString().slice(0, 10);
    useMonthlyEvents.mockReturnValue({
      ...state,
      occurrences: [{ ...event, occurrenceDate: today }],
    });
    useBudgetCalendar.mockReturnValue({
      summary: null,
      summaryStatus: "future",
      pending: [],
      categories: [],
      operations: [],
      operationsMeta: null,
      operationsStatus: "success",
      mutationStatus: "idle",
      message: { tone: "info", text: "" },
      retry: vi.fn(),
    });
    render(<Calendrier />);
    expect(
      screen.getByRole("heading", { name: "Calendrier" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1 événement prévu/ })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mois suivant" }));
    expect(useMonthlyEvents).toHaveBeenCalled();
  });

  it("announces the events loading in a region mounted beforehand (#164)", async () => {
    const { rerender } = render(<Objectifs />);
    const captured = captureLiveRegions();

    useMonthlyEvents.mockReturnValue({ ...state, status: "loading" });
    rerender(<Objectifs />);
    await expectAnnouncedIn(captured, "status", "Chargement des événements…");
  });

  it("renders recoverable loading, empty and error states", () => {
    useMonthlyEvents.mockReturnValue({
      ...state,
      status: "loading",
      events: [],
    });
    const { rerender } = render(<Objectifs />);
    expect(
      screen.getByRole("heading", { name: "Chargement des événements…" })
    ).toBeInTheDocument();
    useMonthlyEvents.mockReturnValue({ ...state, events: [] });
    rerender(<Objectifs />);
    expect(
      screen.getByRole("heading", { name: "Aucun événement prévu" })
    ).toBeInTheDocument();
    useMonthlyEvents.mockReturnValue({
      ...state,
      status: "error",
      events: [],
      message: "Erreur",
    });
    rerender(<Objectifs />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(actions.retry).toHaveBeenCalledTimes(1);
  });
});

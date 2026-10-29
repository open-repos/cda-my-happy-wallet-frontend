import { listCalendarResolutions } from "../../src/js/services/calendarResolutionsService";
vi.mock("../../src/js/services/calendarResolutionsService", () => ({
  listCalendarResolutions: vi.fn(),
}));
import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { useAnnouncesLoading } from "../../src/js/hooks/useAnnouncesLoading";
import { useBudgetCalendar } from "../../src/js/hooks/useBudgetCalendar";
import { useMonthlyEvents } from "../../src/js/hooks/useMonthlyEvents";
import { budgetService } from "../../src/js/services/budgetService";
import { monthlyEventsService as service } from "../../src/js/services/monthlyEventsService";
import { oneOffOperationsService as operations } from "../../src/js/services/oneOffOperationsService";

vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: {
    listEvents: vi.fn(),
    listOccurrences: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));

vi.mock("../../src/js/services/budgetService", async (importOriginal) => ({
  ...(await importOriginal()),
  budgetService: {
    getSummary: vi.fn(),
    listPending: vi.fn(),
    realizeOccurrence: vi.fn(),
    cancelOccurrence: vi.fn(),
  },
}));
vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listAllOperations: vi.fn(),
    listAllCategories: vi.fn(),
    createOperation: vi.fn(),
  },
}));

/**
 * Vrais hooks dans le vrai SimulationProvider (#171) : après une
 * modification, invalidate() relance un chargement dans le même lot de rendu
 * que le message de succès. Chaque rendu est enregistré.
 */
const mount = () => {
  const renders = [];
  let current;
  const Probe = () => {
    current = useMonthlyEvents("2026-10");
    const announces = useAnnouncesLoading(current.status, "2026-10");
    renders.push({
      status: current.status,
      message: current.message,
      announces,
    });
    return null;
  };
  render(
    <SimulationProvider>
      <Probe />
    </SimulationProvider>
  );
  return {
    renders,
    get current() {
      return current;
    },
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  service.listEvents.mockResolvedValue([]);
  service.listOccurrences.mockResolvedValue([]);
  service.createEvent.mockResolvedValue({ id: 1 });
  budgetService.getSummary.mockResolvedValue({ days: [], revision: 1 });
  budgetService.listPending.mockResolvedValue([]);
  operations.listAllCategories.mockResolvedValue([]);
  operations.listAllOperations.mockResolvedValue([]);
  listCalendarResolutions.mockResolvedValue([]);
});
afterEach(cleanup);

describe("loading announcements around a mutation (#171)", () => {
  it("announces the first loading, then only the outcome of a mutation", async () => {
    const view = mount();
    await waitFor(() => expect(view.current.status).toBe("success"));
    expect(view.renders[0].announces).toBe(true);

    const before = view.renders.length;
    let finishRead;
    service.listEvents.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        })
    );
    let saving;
    await act(async () => {
      saving = view.current.createEvent({ title: "Assurance" });
    });
    await waitFor(() => expect(view.current.status).toBe("loading"));
    await act(async () => {
      finishRead([]);
      await saving;
    });
    await waitFor(() => expect(view.current.status).toBe("success"));

    const after = view.renders.slice(before);
    // La relecture coordonnée a eu lieu une fois, sans GET redondant…
    expect(service.listEvents.mock.calls.length).toBe(2);
    expect(after.some(({ status }) => status === "loading")).toBe(true);
    // …sans jamais demander l'annonce d'un chargement.
    expect(after.every(({ announces }) => !announces)).toBe(true);
    expect(view.current.message).toBe("Événement ajouté.");
  });

  it("filters an already complete month without announcing another network load", async () => {
    const renders = [];
    let current;
    const Probe = ({ selectedDate }) => {
      current = useBudgetCalendar("2026-10", selectedDate);
      const announces = useAnnouncesLoading(
        current.operationsStatus,
        `2026-10:${selectedDate}`
      );
      renders.push({ status: current.operationsStatus, announces });
      return null;
    };
    const view = render(
      <SimulationProvider>
        <Probe selectedDate={null} />
      </SimulationProvider>
    );
    await waitFor(() => expect(current.operationsStatus).toBe("success"));

    const calls = operations.listAllOperations.mock.calls.length;
    view.rerender(
      <SimulationProvider>
        <Probe selectedDate="2026-10-12" />
      </SimulationProvider>
    );
    expect(current.operationsStatus).toBe("success");
    expect(operations.listAllOperations).toHaveBeenCalledTimes(calls);
  });
});

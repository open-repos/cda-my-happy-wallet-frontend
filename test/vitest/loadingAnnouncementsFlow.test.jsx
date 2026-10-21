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
    listOperations: vi.fn(),
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
  operations.listOperations.mockResolvedValue({
    data: [],
    meta: { hasNext: false },
  });
});
afterEach(cleanup);

describe("loading announcements around a mutation (#171)", () => {
  it("announces the first loading, then only the outcome of a mutation", async () => {
    const view = mount();
    await waitFor(() => expect(view.current.status).toBe("success"));
    expect(view.renders[0].announces).toBe(true);

    const before = view.renders.length;
    await act(() => view.current.createEvent({ title: "Assurance" }));
    await waitFor(() => expect(view.current.status).toBe("success"));

    const after = view.renders.slice(before);
    // Le rechargement relancé par invalidate() a bien eu lieu…
    expect(service.listEvents.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(after.some(({ status }) => status === "loading")).toBe(true);
    // …sans jamais demander l'annonce d'un chargement.
    expect(after.every(({ announces }) => !announces)).toBe(true);
    expect(view.current.message).toBe("Événement ajouté.");
  });

  it("announces the operations of a newly selected day", async () => {
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

    let resolveDay;
    operations.listOperations.mockReturnValue(
      new Promise((resolve) => {
        resolveDay = resolve;
      })
    );
    const before = renders.length;
    view.rerender(
      <SimulationProvider>
        <Probe selectedDate="2026-10-12" />
      </SimulationProvider>
    );
    await waitFor(() => expect(current.operationsStatus).toBe("loading"));
    expect(renders.slice(before).some(({ announces }) => announces)).toBe(true);
    await act(async () => resolveDay({ data: [], meta: { hasNext: false } }));
    await waitFor(() => expect(current.operationsStatus).toBe("success"));
  });
});

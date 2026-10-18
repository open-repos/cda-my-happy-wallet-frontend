import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMonthlyEvents } from "../../src/js/hooks/useMonthlyEvents";
import { monthlyEventsService as service } from "../../src/js/services/monthlyEventsService";

vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: {
    listEvents: vi.fn(),
    listOccurrences: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));

const event = { id: 4, title: "Assurance", amount: "120.00" };
const occurrence = { eventId: 4, occurrenceDate: "2026-10-20" };
const mount = (month = "2026-10") => {
  let current;
  const Probe = ({ month }) => {
    current = useMonthlyEvents(month);
    return null;
  };
  const view = render(<Probe month={month} />);
  return {
    get current() {
      return current;
    },
    changeMonth: (next) => view.rerender(<Probe month={next} />),
  };
};

beforeEach(() => {
  vi.resetAllMocks();
  service.listEvents.mockResolvedValue([event]);
  service.listOccurrences.mockResolvedValue([occurrence]);
});
afterEach(cleanup);

describe("useMonthlyEvents", () => {
  it("loads events and the occurrences of the selected month", async () => {
    const result = mount();
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.events).toEqual([event]);
    expect(result.current.occurrences).toEqual([occurrence]);
    expect(service.listEvents).toHaveBeenCalledExactlyOnceWith();
    expect(service.listOccurrences).toHaveBeenCalledExactlyOnceWith("2026-10");
  });

  it("reloads for another month and accepts empty results", async () => {
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    service.listEvents.mockResolvedValueOnce([]);
    service.listOccurrences.mockResolvedValueOnce([]);
    result.changeMonth("2026-11");
    await waitFor(() => expect(result.current.events).toEqual([]));
    expect(result.current.occurrences).toEqual([]);
    expect(result.current.status).toBe("success");
    expect(service.listOccurrences).toHaveBeenLastCalledWith("2026-11");
  });

  it.each(["listEvents", "listOccurrences"])(
    "allows retry after %s fails without exposing the server error",
    async (method) => {
      service[method].mockRejectedValueOnce(new Error("private server detail"));
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("error"));
      expect(result.current.message).toBe(
        "Impossible de charger vos événements. Vérifiez votre connexion puis réessayez."
      );
      expect(result.current.events).toEqual([]);
      expect(result.current.occurrences).toEqual([]);
      await act(async () => expect(await result.current.retry()).toBe(true));
      expect(result.current.status).toBe("success");
      expect(result.current.events).toEqual([event]);
      expect(result.current.occurrences).toEqual([occurrence]);
      expect(result.current.message).toBe("");
    }
  );

  it.each([
    ["createEvent", [event], "Événement ajouté."],
    ["updateEvent", [4, event], "Événement modifié."],
    ["deleteEvent", [4], "Événement supprimé."],
  ])(
    "%s refreshes events and occurrences after the write",
    async (method, args, message) => {
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("success"));
      service.listEvents.mockResolvedValueOnce([]);
      service.listOccurrences.mockResolvedValueOnce([]);
      await act(async () =>
        expect(await result.current[method](...args)).toBe(true)
      );
      expect(service[method]).toHaveBeenCalledExactlyOnceWith(...args);
      expect(service.listEvents).toHaveBeenCalledTimes(2);
      expect(service.listOccurrences).toHaveBeenLastCalledWith("2026-10");
      expect(service.listOccurrences).toHaveBeenCalledTimes(2);
      expect(result.current.events).toEqual([]);
      expect(result.current.occurrences).toEqual([]);
      expect(result.current.mutationStatus).toBe("success");
      expect(result.current.message).toBe(message);
    }
  );

  it.each(["createEvent", "updateEvent", "deleteEvent"])(
    "%s keeps the existing data after a failed write",
    async (method) => {
      service[method].mockRejectedValueOnce(new Error("private server detail"));
      const result = mount();
      await waitFor(() => expect(result.current.status).toBe("success"));
      await act(async () =>
        expect(await result.current[method](4, event)).toBe(false)
      );
      expect(result.current.mutationStatus).toBe("error");
      expect(result.current.message).toBe(
        "L’événement n’a pas pu être enregistré. Réessayez."
      );
      expect(result.current.events).toEqual([event]);
      expect(result.current.occurrences).toEqual([occurrence]);
      expect(service.listEvents).toHaveBeenCalledTimes(1);
      expect(service.listOccurrences).toHaveBeenCalledTimes(1);
    }
  );

  it("keeps a saved write successful when the refresh fails, and retries only reading", async () => {
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    service.listOccurrences.mockRejectedValueOnce(new Error("offline"));
    await act(async () =>
      expect(await result.current.createEvent(event)).toBe(true)
    );
    expect(result.current.status).toBe("error");
    expect(result.current.mutationStatus).toBe("success");
    expect(result.current.message).toBe(
      "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé."
    );
    await act(async () => result.current.retry());
    expect(result.current.status).toBe("success");
    expect(service.createEvent).toHaveBeenCalledTimes(1);
  });

  it("keeps the mutation pending until refreshed data is available", async () => {
    const result = mount();
    await waitFor(() => expect(result.current.status).toBe("success"));
    let finish;
    service.listOccurrences.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let saving;
    await act(async () => {
      saving = result.current.createEvent(event);
    });
    expect(result.current.mutationStatus).toBe("loading");
    expect(result.current.status).toBe("loading");
    expect(result.current.message).toBe("");
    await act(async () => {
      finish([]);
      await saving;
    });
    expect(result.current.mutationStatus).toBe("success");
    expect(result.current.occurrences).toEqual([]);
  });
});

import { listCalendarResolutions } from "../../src/js/services/calendarResolutionsService";
import { monthlyEventsService } from "../../src/js/services/monthlyEventsService";
vi.mock("../../src/js/services/calendarResolutionsService", () => ({
  listCalendarResolutions: vi.fn(),
}));
vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: { listOccurrences: vi.fn() },
}));
import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  monthEnd,
  useBudgetCalendar,
} from "../../src/js/hooks/useBudgetCalendar";
import { budgetService } from "../../src/js/services/budgetService";
import { oneOffOperationsService as operations } from "../../src/js/services/oneOffOperationsService";

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

const occurrence = { eventId: 4, occurrenceDate: "2026-02-12" };
const summary = { realRemaining: "1200.00", revision: 1 };
const row = {
  id: 7,
  title: "Courses",
  operationDate: "2026-02-12",
  amount: "40.00",
  currency: "EUR",
  type: "DEPENSE",
  categoryId: 2,
};
const category = { id: 2, name: "Alimentation" };
const page = { data: [row], meta: { hasNext: true, nextCursor: "v1.next" } };
const apiError = (code) => ({
  response: { data: { error: { details: { code } } } },
});
const mount = () => {
  let current;
  const Probe = ({ month, selectedDate }) => {
    current = useBudgetCalendar(month, selectedDate);
    return null;
  };
  const view = render(<Probe month="2026-02" selectedDate={null} />);
  return {
    get current() {
      return current;
    },
    select: (month, selectedDate) =>
      view.rerender(<Probe month={month} selectedDate={selectedDate} />),
  };
};
const loaded = (result) =>
  waitFor(() => {
    expect(result.current.summaryStatus).toBe("success");
    expect(result.current.operationsStatus).toBe("success");
  });

beforeEach(() => {
  vi.resetAllMocks();
  budgetService.getSummary.mockResolvedValue(summary);
  budgetService.listPending.mockResolvedValue([occurrence]);
  operations.listAllCategories.mockResolvedValue([category]);
  operations.listAllOperations.mockResolvedValue([row]);
  listCalendarResolutions.mockResolvedValue([]);
  monthlyEventsService.listOccurrences.mockResolvedValue([]);
});
afterEach(cleanup);

describe("useBudgetCalendar", () => {
  it.each([
    ["2026-02", "2026-02-28"],
    ["2028-02", "2028-02-29"],
    ["2026-04", "2026-04-30"],
    ["2026-12", "2026-12-31"],
  ])("bounds month %s at %s", (month, end) => {
    expect(monthEnd(month)).toBe(end);
  });

  it("loads the month summary, pending queue, categories and operations independently", async () => {
    const result = mount();
    expect(result.current.summaryStatus).toBe("loading");
    expect(result.current.operationsStatus).toBe("loading");
    await loaded(result);
    expect(budgetService.getSummary).toHaveBeenCalledExactlyOnceWith(
      "2026-02",
      "EUR"
    );
    expect(budgetService.listPending).toHaveBeenCalledExactlyOnceWith(
      "2026-02-28"
    );
    expect(operations.listAllOperations).toHaveBeenCalledExactlyOnceWith({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(result.current.summary).toEqual(summary);
    expect(result.current.pending).toEqual([occurrence]);
    expect(result.current.categories).toEqual([category]);
    expect(result.current.operations).toEqual([row]);
  });

  it("filters a selected day without reloading the monthly summary", async () => {
    const result = mount();
    await loaded(result);
    result.select("2026-02", "2026-02-12");
    expect(operations.listAllOperations).toHaveBeenCalledTimes(1);
    expect(budgetService.getSummary).toHaveBeenCalledTimes(1);
    result.select("2026-03", null);
    await waitFor(() =>
      expect(budgetService.getSummary).toHaveBeenLastCalledWith(
        "2026-03",
        "EUR"
      )
    );
    expect(budgetService.listPending).toHaveBeenLastCalledWith("2026-03-31");
    expect(operations.listAllOperations).toHaveBeenLastCalledWith({
      from: "2026-03-01",
      to: "2026-03-31",
    });
    await loaded(result);
  });

  it("keeps future periods distinct from failures and still loads their pending events", async () => {
    budgetService.getSummary.mockRejectedValueOnce(apiError("FUTURE_PERIOD"));
    const result = mount();
    await waitFor(() => expect(result.current.summaryStatus).toBe("future"));
    expect(result.current.summary).toBeNull();
    expect(result.current.pending).toEqual([occurrence]);
    await waitFor(() =>
      expect(result.current.operationsStatus).toBe("success")
    );
  });

  it("keeps operations usable after a summary failure and retries both sections", async () => {
    budgetService.getSummary.mockRejectedValueOnce(new Error("offline"));
    const result = mount();
    await waitFor(() => expect(result.current.summaryStatus).toBe("error"));
    await waitFor(() =>
      expect(result.current.operationsStatus).toBe("success")
    );
    expect(result.current.operations).toEqual([row]);
    await act(async () => result.current.retry());
    await loaded(result);
    expect(budgetService.getSummary).toHaveBeenCalledTimes(2);
    expect(operations.listAllOperations).toHaveBeenCalledTimes(2);
  });

  it("keeps the summary usable after an operations failure", async () => {
    operations.listAllOperations.mockRejectedValueOnce(new Error("offline"));
    const result = mount();
    await waitFor(() => expect(result.current.operationsStatus).toBe("error"));
    await waitFor(() => expect(result.current.summaryStatus).toBe("success"));
    expect(result.current.summary).toEqual(summary);
    await act(async () => result.current.retry());
    await loaded(result);
  });

  it("does not expose partial pages and clears content on a failed month", async () => {
    const result = mount();
    await loaded(result);
    expect(result.current.operationsMeta.hasNext).toBe(false);
    operations.listAllOperations.mockRejectedValueOnce(
      new Error("last page offline")
    );
    result.select("2026-03", null);
    await waitFor(() => expect(result.current.operationsStatus).toBe("error"));
    expect(result.current.content).toEqual([]);
    expect(result.current.operations).toEqual([]);
    await act(() => result.current.retry());
    await loaded(result);
  });

  it("discards a late result from the previous month", async () => {
    let resolveOld;
    operations.listAllOperations.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    const result = mount();
    result.select("2026-03", null);
    await loaded(result);
    await act(() => resolveOld([{ ...row, id: 99 }]));
    expect(result.current.operations).toEqual([row]);
  });

  it.each([
    [
      "createOperation",
      [row],
      operations.createOperation,
      [row],
      "Opération ajoutée.",
    ],
    [
      "realizeOccurrence",
      [occurrence, { amount: "120.00" }],
      budgetService.realizeOccurrence,
      [4, "2026-02-12", { amount: "120.00" }],
      "Événement converti en opération.",
    ],
    [
      "cancelOccurrence",
      [occurrence],
      budgetService.cancelOccurrence,
      [4, "2026-02-12"],
      "Événement annulé.",
    ],
  ])(
    "%s refreshes both sections after saving",
    async (method, args, gateway, expected, text) => {
      const result = mount();
      await loaded(result);
      const revised = { ...summary, revision: 2, realRemaining: "1080.00" };
      budgetService.getSummary.mockResolvedValueOnce(revised);
      budgetService.listPending.mockResolvedValueOnce([]);
      await act(async () =>
        expect(await result.current[method](...args)).toBe(true)
      );
      expect(gateway).toHaveBeenCalledExactlyOnceWith(...expected);
      expect(budgetService.getSummary).toHaveBeenCalledTimes(2);
      expect(operations.listAllOperations).toHaveBeenCalledTimes(2);
      expect(result.current.summary).toEqual(revised);
      expect(result.current.pending).toEqual([]);
      expect(result.current.mutationStatus).toBe("success");
      expect(result.current.message).toEqual({ tone: "success", text });
    }
  );

  it.each([
    [
      "PERIOD_CLOSED",
      "Ce mois est clôturé : choisissez une date du mois en cours pour enregistrer l’opération.",
      1,
    ],
    [
      "OCCURRENCE_ALREADY_RESOLVED",
      "Cet événement a déjà été traité. L’affichage a été actualisé.",
      2,
    ],
    [
      "UNKNOWN_PRIVATE_DETAIL",
      "L’enregistrement a échoué. Vérifiez votre connexion puis réessayez.",
      1,
    ],
  ])(
    "handles mutation error %s without claiming success",
    async (code, text, loads) => {
      const result = mount();
      await loaded(result);
      budgetService.cancelOccurrence.mockRejectedValueOnce(apiError(code));
      budgetService.listPending.mockResolvedValueOnce([]);
      await act(async () =>
        expect(await result.current.cancelOccurrence(occurrence)).toBe(false)
      );
      expect(result.current.mutationStatus).toBe("error");
      expect(result.current.message).toEqual({ tone: "error", text });
      expect(budgetService.getSummary).toHaveBeenCalledTimes(loads);
      expect(operations.listAllOperations).toHaveBeenCalledTimes(1);
      if (code === "OCCURRENCE_ALREADY_RESOLVED")
        expect(result.current.pending).toEqual([]);
    }
  );

  it("reports a saved operation even if the refreshed summary fails", async () => {
    const result = mount();
    await loaded(result);
    budgetService.getSummary.mockRejectedValueOnce(new Error("offline"));
    await act(async () =>
      expect(await result.current.createOperation(row)).toBe(true)
    );
    expect(result.current.mutationStatus).toBe("success");
    expect(result.current.summaryStatus).toBe("error");
    expect(result.current.message.text).toBe(
      "C’est enregistré, mais l’affichage n’a pas pu être actualisé."
    );
    await act(async () => result.current.retry());
    await loaded(result);
    expect(operations.createOperation).toHaveBeenCalledTimes(1);
  });
});

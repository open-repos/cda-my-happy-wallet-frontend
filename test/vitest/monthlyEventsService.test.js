import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  monthlyEventsService,
  parseMonthlyEvent,
} from "../../src/js/services/monthlyEventsService";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const event = {
  id: 4,
  title: "Assurance annuelle",
  amount: "120.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: "2026-09-20",
  recurrence: "MENSUELLE",
  endDate: null,
};
const page = (
  data,
  meta = { limit: 100, hasNext: false, nextCursor: null }
) => ({ data: { data, meta } });

beforeEach(() => vi.clearAllMocks());

describe("monthlyEventsService", () => {
  it("loads every opaque cursor page and validates event occurrences", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(
        page([event], { limit: 100, hasNext: true, nextCursor: "opaque.next" })
      )
      .mockResolvedValueOnce(page([{ ...event, id: 5 }]))
      .mockResolvedValueOnce(
        page([{ ...event, occurrenceDate: "2026-09-20" }])
      );

    await expect(monthlyEventsService.listEvents()).resolves.toHaveLength(2);
    await expect(
      monthlyEventsService.listOccurrences("2026-09")
    ).resolves.toEqual([{ ...event, occurrenceDate: "2026-09-20" }]);
    expect(apiPrivate.get).toHaveBeenLastCalledWith("/event-occurrences", {
      params: { month: "2026-09", limit: 100 },
      withCredentials: true,
    });
  });

  it("rejects malformed DTOs and removes private owner data", () => {
    expect(() => parseMonthlyEvent({ ...event, amount: 120 })).toThrow(
      "Invalid monthly event response"
    );
    const parsed = parseMonthlyEvent({ ...event, ownerId: 12 });
    expect(parsed).toEqual(event);
    expect(parsed).not.toHaveProperty("ownerId");
  });

  it("uses the owner-scoped CRUD routes without owner data", async () => {
    const body = {
      title: event.title,
      amount: event.amount,
      currency: "EUR",
      kind: event.kind,
      startDate: event.startDate,
      recurrence: event.recurrence,
      endDate: null,
    };
    apiPrivate.post.mockResolvedValue({ data: { data: event } });
    apiPrivate.put.mockResolvedValue({ data: { data: event } });
    apiPrivate.delete.mockResolvedValue({ status: 204 });
    await monthlyEventsService.createEvent(body);
    await monthlyEventsService.updateEvent(4, body);
    await monthlyEventsService.deleteEvent(4);
    expect(apiPrivate.post).toHaveBeenCalledWith("/events", body, {
      withCredentials: true,
    });
    expect(apiPrivate.put).toHaveBeenCalledWith("/events/4", body, {
      withCredentials: true,
    });
    expect(apiPrivate.delete).toHaveBeenCalledWith("/events/4", {
      withCredentials: true,
    });
    expect(body).not.toHaveProperty("ownerId");
  });
});

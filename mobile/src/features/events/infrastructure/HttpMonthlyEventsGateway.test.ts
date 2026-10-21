import { describe, expect, it, vi } from "vitest";

import {
  EVENTS_PAGE_LIMIT,
  EventRequestError,
  HttpMonthlyEventsGateway,
} from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";

const event = {
  id: 4,
  title: "Assurance",
  amount: "120.00",
  currency: "EUR",
  kind: "DEPENSE" as const,
  startDate: "2026-09-20",
  recurrence: "MENSUELLE" as const,
  endDate: null,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const page = (data: unknown[], nextCursor: string | null = null) =>
  json({
    data,
    meta: { limit: EVENTS_PAGE_LIMIT, hasNext: nextCursor != null, nextCursor },
  });
const draft = {
  title: "Assurance",
  amount: "120",
  kind: "DEPENSE" as const,
  startDate: "2026-09-20",
  recurrence: "MENSUELLE" as const,
  endDate: null,
};

describe("HttpMonthlyEventsGateway (#225)", () => {
  it("loads every page of confirmed events", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(page([event], "next+/="))
      .mockResolvedValueOnce(page([{ ...event, id: 5 }]));
    const gateway = new HttpMonthlyEventsGateway({ request });
    await expect(gateway.listAllEvents()).resolves.toHaveLength(2);
    expect(request).toHaveBeenNthCalledWith(
      1,
      `/events?limit=${EVENTS_PAGE_LIMIT}`,
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      `/events?limit=${EVENTS_PAGE_LIMIT}&cursor=next%2B%2F%3D`,
    );
  });

  it("rejects a repeated cursor", async () => {
    const request = vi
      .fn()
      .mockImplementation(() => Promise.resolve(page([], "same")));
    await expect(
      new HttpMonthlyEventsGateway({ request }).listAllEvents(),
    ).rejects.toThrow("Repeated event cursor");
  });

  it("creates, updates and deletes with the Web contract", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json({ data: event }, 201))
      .mockResolvedValueOnce(json({ data: { ...event, title: "Loyer" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const gateway = new HttpMonthlyEventsGateway({ request });

    await expect(gateway.createEvent(draft)).resolves.toEqual(event);
    expect(request).toHaveBeenNthCalledWith(1, "/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Assurance",
        amount: "120.00",
        currency: "EUR",
        kind: "DEPENSE",
        startDate: "2026-09-20",
        recurrence: "MENSUELLE",
        endDate: null,
      }),
    });
    await expect(gateway.updateEvent(4, draft)).resolves.toMatchObject({
      title: "Loyer",
    });
    expect(request.mock.calls[1][0]).toBe("/events/4");
    expect(request.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    await expect(gateway.deleteEvent(4)).resolves.toBeUndefined();
    expect(request).toHaveBeenNthCalledWith(3, "/events/4", {
      method: "DELETE",
    });
  });

  it("exposes the HTTP status of a failed request", async () => {
    const request = vi.fn().mockResolvedValue(json({}, 422));
    await expect(
      new HttpMonthlyEventsGateway({ request }).createEvent(draft),
    ).rejects.toEqual(new EventRequestError(422));
  });
});

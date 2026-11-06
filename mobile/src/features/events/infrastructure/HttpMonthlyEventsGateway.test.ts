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
    // Sans statut : un potentiel modifié reste potentiel (#241).
    expect(JSON.parse(request.mock.calls[1][1].body)).not.toHaveProperty(
      "status",
    );
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

  it("keeps the business refusal code of a failed request (#241)", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        json({ error: { details: { code: "EXPIRED_POTENTIAL" } } }, 422),
      );
    await expect(
      new HttpMonthlyEventsGateway({ request }).createPotentialEvent(draft),
    ).rejects.toMatchObject({ status: 422, code: "EXPIRED_POTENTIAL" });
  });
});

describe("HttpMonthlyEventsGateway potentials (#241)", () => {
  const potential = { ...event, id: 9, status: "POTENTIEL" };

  it("lists every page of potentials only", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(page([potential], "next"))
      .mockResolvedValueOnce(page([{ ...potential, id: 10 }]));
    const gateway = new HttpMonthlyEventsGateway({ request });
    await expect(gateway.listPotentialEvents()).resolves.toHaveLength(2);
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      `/events?status=POTENTIEL&limit=${EVENTS_PAGE_LIMIT}`,
      `/events?status=POTENTIEL&limit=${EVENTS_PAGE_LIMIT}&cursor=next`,
    ]);

    const confirmed = vi.fn().mockResolvedValue(page([event]));
    await expect(
      new HttpMonthlyEventsGateway({
        request: confirmed,
      }).listPotentialEvents(),
    ).rejects.toThrow("Invalid potential event response");
  });

  it("creates a potential with its status", async () => {
    const request = vi.fn().mockResolvedValue(json({ data: potential }, 201));
    await expect(
      new HttpMonthlyEventsGateway({ request }).createPotentialEvent(draft),
    ).resolves.toMatchObject({ id: 9, status: "POTENTIEL" });
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({
      status: "POTENTIEL",
    });
  });

  it("confirms through the dedicated route and checks the answer", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        json({ data: { ...potential, status: "CONFIRME" } }),
      )
      .mockResolvedValueOnce(json({ data: potential }));
    const gateway = new HttpMonthlyEventsGateway({ request });
    await expect(gateway.confirmPotentialEvent(9)).resolves.toMatchObject({
      status: "CONFIRME",
    });
    expect(request).toHaveBeenCalledWith("/events/9/confirm", {
      method: "POST",
    });
    await expect(gateway.confirmPotentialEvent(9)).rejects.toThrow(
      "Invalid confirmed event response",
    );
  });

  it("clears the simulation", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    await new HttpMonthlyEventsGateway({ request }).clearPotentialEvents();
    expect(request).toHaveBeenCalledWith("/simulation/events", {
      method: "DELETE",
    });
  });
});

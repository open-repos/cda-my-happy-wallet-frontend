import { describe, expect, it, vi } from "vitest";

import {
  HttpOccurrencesGateway,
  OccurrenceRequestError,
} from "@/src/features/budget/infrastructure/HttpOccurrencesGateway";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const occurrence = {
  eventId: 3,
  occurrenceDate: "2026-10-05",
  title: "Loyer",
  amount: "900.00",
  currency: "EUR",
  kind: "DEPENSE",
  overdue: true,
};
const page = (data: unknown[], nextCursor: string | null) => ({
  data,
  meta: { limit: 100, hasNext: nextCursor !== null, nextCursor },
});

describe("HttpOccurrencesGateway", () => {
  it("loads every page of the pending queue through a date", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(json(200, page([occurrence], "next")))
      .mockResolvedValueOnce(
        json(200, page([{ ...occurrence, eventId: 4 }], null)),
      );

    const items = await new HttpOccurrencesGateway({ request }).listPending(
      "2026-10-31",
    );

    expect(items.map(({ eventId }) => eventId)).toEqual([3, 4]);
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/event-occurrences/pending?through=2026-10-31&limit=100",
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/event-occurrences/pending?through=2026-10-31&limit=100&cursor=next",
    );
  });

  it("stops on a repeated cursor", async () => {
    const request = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(json(200, page([occurrence], "same"))),
      );
    await expect(
      new HttpOccurrencesGateway({ request }).listPending("2026-10-31"),
    ).rejects.toThrow("Repeated pending cursor");
  });

  it("posts a realize decision", async () => {
    const request = vi.fn().mockResolvedValue(json(201, { data: {} }));
    const body = {
      categoryId: 2,
      title: "Loyer",
      amount: "900.00",
      operationDate: "2026-10-05",
    };

    await new HttpOccurrencesGateway({ request }).realize(
      3,
      "2026-10-05",
      body,
    );

    expect(request).toHaveBeenCalledWith(
      "/event-occurrences/3/2026-10-05/realize",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  });

  it("posts a cancel decision and reports its business code", async () => {
    const request = vi.fn().mockResolvedValue(
      json(409, {
        error: { details: { code: "OCCURRENCE_ALREADY_RESOLVED" } },
      }),
    );

    await expect(
      new HttpOccurrencesGateway({ request }).cancel(3, "2026-10-05"),
    ).rejects.toEqual(
      new OccurrenceRequestError(409, "OCCURRENCE_ALREADY_RESOLVED"),
    );
    expect(request).toHaveBeenCalledWith(
      "/event-occurrences/3/2026-10-05/cancel",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
  });
});

import { describe, expect, it, vi } from "vitest";

import { HttpEnvelopesGateway } from "@/src/features/envelopes/infrastructure/HttpEnvelopesGateway";
import {
  envelopeOccurrence,
  envelopeOverview,
  envelopePayment,
  envelopeStatistics,
} from "@/src/features/envelopes/testing/envelopeFixtures";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const page = (data: unknown[], nextCursor: string | null = null) => ({
  data,
  meta: { limit: 20, hasNext: nextCursor !== null, nextCursor },
});
const client = (...responses: Response[]) => {
  const request = vi.fn<(path: string) => Promise<Response>>();
  responses.forEach((r) => request.mockResolvedValueOnce(r));
  return { request };
};

describe("HttpEnvelopesGateway (#384)", () => {
  it("reads the month cards in EUR, with the opaque cursor", async () => {
    const http = client(json(page([envelopeOverview()], "next")));
    const gateway = new HttpEnvelopesGateway(http);

    const result = await gateway.overview("2026-10", "abc");

    expect(http.request).toHaveBeenCalledWith(
      "/envelope-overview?month=2026-10&currency=EUR&limit=20&cursor=abc",
    );
    expect(result.data[0].totals.actual).toBe("223.00");
    expect(result.meta.nextCursor).toBe("next");
  });

  it("reads an occurrence and its linked payments", async () => {
    const http = client(
      json({ data: envelopeOccurrence() }),
      json(page([envelopePayment()])),
    );
    const gateway = new HttpEnvelopesGateway(http);

    expect((await gateway.occurrence(41)).title).toBe("Alimentation");
    expect((await gateway.payments(41)).data[0].occurrenceId).toBe(41);
    expect(http.request).toHaveBeenNthCalledWith(
      2,
      "/reconciliation/occurrences/41/operations?unassociated=false&limit=20",
    );
  });

  it("finds the yearly statistics of an envelope across pages", async () => {
    const other = { ...envelopeOverview(), id: 3 };
    const target = { ...envelopeOverview(), statistics: envelopeStatistics };
    const http = client(json(page([other], "p2")), json(page([target])));
    const gateway = new HttpEnvelopesGateway(http);

    const statistics = await gateway.yearStatistics(7, "2026");

    expect(statistics?.meanActual).toBe("325.00");
    expect(http.request).toHaveBeenNthCalledWith(
      2,
      "/envelope-overview?year=2026&currency=EUR&limit=20&cursor=p2",
    );
  });

  it("stops on a repeated cursor and on HTTP errors", async () => {
    const other = { ...envelopeOverview(), id: 3 };
    const repeated = new HttpEnvelopesGateway(
      client(json(page([other], "p2")), json(page([other], "p2"))),
    );
    await expect(repeated.yearStatistics(7, "2026")).rejects.toThrow();

    const failing = new HttpEnvelopesGateway(client(json({}, 503)));
    await expect(failing.overview("2026-10")).rejects.toThrow();
  });

  it("returns null when the envelope has no yearly row", async () => {
    const gateway = new HttpEnvelopesGateway(client(json(page([]))));
    expect(await gateway.yearStatistics(7, "2026")).toBeNull();
  });
});

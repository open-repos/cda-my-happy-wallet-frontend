import { describe, expect, it, vi } from "vitest";

import { HttpMonthEndGateway } from "@/src/features/month-end/infrastructure/HttpMonthEndGateway";
import {
  decidedDecision,
  pendingDecision,
} from "@/src/features/month-end/testing/monthEndFixtures";
import { VaultRequestError } from "@/src/features/vault/infrastructure/HttpVaultGateway";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const client = (...responses: Response[]) => {
  const request =
    vi.fn<(path: string, init?: RequestInit) => Promise<Response>>();
  responses.forEach((response) => request.mockResolvedValueOnce(response));
  return { request };
};

describe("HttpMonthEndGateway (#420, backend #184)", () => {
  it("reads the decision of a closed month by currency", async () => {
    const http = client(json({ data: pendingDecision() }));
    const decision = await new HttpMonthEndGateway(http).get("2026-10", "EUR");
    expect(decision.status).toBe("PENDING");
    expect(decision.resultBeforeDecisionMinorUnits).toBe(15000);
    expect(http.request).toHaveBeenCalledWith(
      "/budget-periods/2026-10/decision?currency=EUR",
    );
  });

  it("refuses an invalid response", async () => {
    const http = client(json({ data: { ...decidedDecision(), status: "X" } }));
    await expect(
      new HttpMonthEndGateway(http).get("2026-10", "EUR"),
    ).rejects.toThrow();
  });

  it("exposes the stable code of a refused read", async () => {
    const http = client(
      json({ error: { details: { code: "PERIOD_NOT_CLOSED" } } }, 409),
    );
    const error = await new HttpMonthEndGateway(http)
      .get("2026-11", "EUR")
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(VaultRequestError);
    expect(error).toMatchObject({ status: 409, code: "PERIOD_NOT_CLOSED" });
  });

  it("replaces the whole decision with the expected revision and the key", async () => {
    const http = client(json({ data: decidedDecision() }));
    await new HttpMonthEndGateway(http).save("2026-10", "EUR", {
      expectedRevision: 0,
      idempotencyKey: "decision-2026-10-abc",
      plan: {
        savings: [{ accountId: 12, amountMinorUnits: 10000 }],
        coverage: [],
        exceptionalIncomeMinorUnits: 0,
      },
    });
    const [path, init] = http.request.mock.calls[0];
    expect(path).toBe("/budget-periods/2026-10/decision?currency=EUR");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({
      expectedRevision: 0,
      idempotencyKey: "decision-2026-10-abc",
      savings: [{ accountId: 12, amountMinorUnits: 10000 }],
      coverage: [],
      exceptionalIncomeMinorUnits: 0,
    });
  });

  it("treats an unreadable 2xx as saved and a 409 as refused", async () => {
    const write = {
      expectedRevision: 1,
      idempotencyKey: "decision-2026-10-abc",
      plan: { savings: [], coverage: [], exceptionalIncomeMinorUnits: 0 },
    };
    const saved = client(new Response("oops", { status: 200 }));
    await expect(
      new HttpMonthEndGateway(saved).save("2026-10", "EUR", write),
    ).resolves.toBeUndefined();
    const refused = client(
      json({ error: { details: { code: "REVISION_CONFLICT" } } }, 409),
    );
    await expect(
      new HttpMonthEndGateway(refused).save("2026-10", "EUR", write),
    ).rejects.toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
  });
});

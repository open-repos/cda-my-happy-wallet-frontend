import { describe, expect, it, vi } from "vitest";

import {
  FIXED_BUDGET_PAGE_LIMIT,
  HttpFixedBudgetGateway,
} from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";

const response = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("HttpFixedBudgetGateway", () => {
  it("loads every cursor page", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          data: [
            {
              idOperationFixe: 2,
              titre: "Salaire",
              montant: "2000.00",
              devise: "EUR",
              typeOperation: "REVENU",
            },
          ],
          meta: { limit: 100, hasNext: true, nextCursor: "next" },
        }),
      )
      .mockResolvedValueOnce(
        response({
          data: [
            {
              idOperationFixe: 1,
              titre: "Loyer",
              montant: "800.00",
              devise: "EUR",
              typeOperation: "CHARGE",
            },
          ],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        }),
      );

    const operations = await new HttpFixedBudgetGateway({ request }).listAll();

    expect(operations).toHaveLength(2);
    expect(request).toHaveBeenNthCalledWith(1, "/operations-fixes?limit=100");
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/operations-fixes?limit=100&cursor=next",
    );
  });

  it("rejects an unsuccessful response", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      new HttpFixedBudgetGateway({ request }).listAll(),
    ).rejects.toThrow("Fixed budget request failed");
  });

  it("loads one management page with an opaque cursor", async () => {
    const request = vi.fn().mockResolvedValue(
      response({
        data: [],
        meta: {
          limit: FIXED_BUDGET_PAGE_LIMIT,
          hasNext: false,
          nextCursor: null,
        },
      }),
    );

    await new HttpFixedBudgetGateway({ request }).list("opaque");

    expect(request).toHaveBeenCalledWith(
      `/operations-fixes?limit=${FIXED_BUDGET_PAGE_LIMIT}&cursor=opaque`,
    );
  });

  it("uses the authenticated type resource and a closed payload for writes", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const gateway = new HttpFixedBudgetGateway({ request });
    const operation = {
      id: 7,
      title: "Salaire",
      amount: "2000.00",
      currency: "EUR",
      type: "REVENU",
    } as const;
    const draft = {
      title: "Salaire net",
      amount: "2100,5",
      type: "REVENU",
    } as const;

    await gateway.create(draft);
    await gateway.update(operation, draft);
    await gateway.delete(operation);

    expect(request).toHaveBeenNthCalledWith(1, "/operations-fixes/revenus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: "Salaire net",
        montant: "2100.50",
        devise: "EUR",
      }),
    });
    expect(request).toHaveBeenNthCalledWith(2, "/operations-fixes/revenus/7", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: "Salaire net",
        montant: "2100.50",
        devise: "EUR",
      }),
    });
    expect(request).toHaveBeenNthCalledWith(3, "/operations-fixes/revenus/7", {
      method: "DELETE",
    });
  });
});

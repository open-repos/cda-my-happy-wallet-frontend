import { describe, expect, it, vi } from "vitest";

import { HttpFixedBudgetGateway } from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";

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
});

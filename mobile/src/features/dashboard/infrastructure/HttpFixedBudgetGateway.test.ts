import { describe, expect, it, vi } from "vitest";

import {
  FIXED_BUDGET_PAGE_LIMIT,
  FixedBudgetRequestError,
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
      categoryId: null,
      category: null,
    } as const;
    const draft = {
      title: "Salaire net",
      amount: "2100,5",
      type: "REVENU",
      categoryId: null,
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

  it("sends the category chosen at creation and a changed category on update", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 200 }));
    const gateway = new HttpFixedBudgetGateway({ request });
    const operation = {
      id: 3,
      title: "Loyer",
      amount: "900.00",
      currency: "EUR",
      type: "CHARGE",
      categoryId: 21,
      category: null,
    } as const;

    await gateway.create({
      title: "Loyer",
      amount: "900",
      type: "CHARGE",
      categoryId: 21,
    });
    await gateway.update(operation, {
      title: "Loyer",
      amount: "900",
      type: "CHARGE",
      categoryId: null,
    });

    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      titre: "Loyer",
      montant: "900.00",
      devise: "EUR",
      categoryId: 21,
    });
    expect(request.mock.calls[1][0]).toBe("/operations-fixes/charges/3");
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({
      titre: "Loyer",
      montant: "900.00",
      devise: "EUR",
      categoryId: null,
    });
  });

  it("reports a refused category with its backend code", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: "error",
          error: {
            statusCode: 422,
            message: "Category unavailable for this fixed operation",
            details: { code: "INVALID_FIXED_CATEGORY" },
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const error = await new HttpFixedBudgetGateway({ request })
      .create({ title: "Loyer", amount: "900", type: "CHARGE", categoryId: 9 })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(FixedBudgetRequestError);
    expect(error).toMatchObject({
      status: 422,
      code: "INVALID_FIXED_CATEGORY",
    });
  });

  it("does not require a readable body for other failures", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("<html>", { status: 502 }));

    await expect(
      new HttpFixedBudgetGateway({ request }).create({
        title: "Loyer",
        amount: "900",
        type: "CHARGE",
        categoryId: null,
      }),
    ).rejects.toMatchObject({ status: 502, code: null });
  });
});

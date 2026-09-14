import { describe, expect, it, vi } from "vitest";

import {
  HttpOneOffOperationsGateway,
  OPERATIONS_PAGE_LIMIT,
} from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

const operation = {
  id: 7,
  title: "Courses",
  amount: "42.50",
  currency: "EUR",
  type: "DEPENSE" as const,
  operationDate: "2026-08-22",
  categoryId: 2,
};
const page = (
  data: unknown[],
  hasNext = false,
  nextCursor: string | null = null,
) =>
  new Response(
    JSON.stringify({ data, meta: { limit: 20, hasNext, nextCursor } }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );

describe("HttpOneOffOperationsGateway", () => {
  it("uses the opaque cursor and the shared bounded collection contract", async () => {
    const request = vi.fn().mockResolvedValue(page([operation]));
    const gateway = new HttpOneOffOperationsGateway({ request });
    await expect(gateway.listOperations("opaque+/=")).resolves.toEqual({
      data: [operation],
      meta: { limit: 20, hasNext: false, nextCursor: null },
    });
    expect(request).toHaveBeenCalledWith(
      `/operations?limit=${OPERATIONS_PAGE_LIMIT}&cursor=opaque%2B%2F%3D`,
    );
  });

  it("loads every category page and rejects a repeated cursor", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        page([{ id: 1, name: "Courses", color: "#00AA00" }], true, "next"),
      )
      .mockResolvedValueOnce(page([{ id: 2, name: "Loisirs", color: null }]));
    const gateway = new HttpOneOffOperationsGateway({ request });
    await expect(gateway.listAllCategories()).resolves.toHaveLength(2);

    const repeatedRequest = vi
      .fn()
      .mockImplementation(() => Promise.resolve(page([], true, "same")));
    await expect(
      new HttpOneOffOperationsGateway({
        request: repeatedRequest,
      }).listAllCategories(),
    ).rejects.toThrow("Repeated category cursor");
  });

  it("never adds an owner field to mutation payloads", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: operation }), { status: 200 }),
      );
    const gateway = new HttpOneOffOperationsGateway({ request });
    await gateway.createOperation({
      title: "Courses",
      amount: "42.50",
      operationDate: "2026-08-22",
      categoryId: 2,
      kind: "DEPENSE",
    });
    const init = request.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      title: "Courses",
      amount: "42.50",
      currency: "EUR",
      kind: "DEPENSE",
      operationDate: "2026-08-22",
      categoryId: 2,
    });
  });
});

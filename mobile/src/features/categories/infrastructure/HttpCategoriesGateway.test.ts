import { describe, expect, it, vi } from "vitest";

import {
  CategoryRequestError,
  HttpCategoriesGateway,
} from "@/src/features/categories/infrastructure/HttpCategoriesGateway";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const saved = { id: 9, name: "Loisirs", color: "#275DAD", icon: null };

describe("HttpCategoriesGateway", () => {
  it("lists every category page", async () => {
    const request = vi.fn().mockResolvedValue(
      json(200, {
        data: [saved],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      }),
    );
    await expect(
      new HttpCategoriesGateway({ request }).listAll(),
    ).resolves.toEqual([{ id: 9, name: "Loisirs", color: "#275DAD" }]);
    expect(request).toHaveBeenCalledWith("/operation-categories?limit=100");
  });

  it("creates and updates with name and color only", async () => {
    const request = vi.fn(() => Promise.resolve(json(201, { data: saved })));
    const gateway = new HttpCategoriesGateway({ request });

    await gateway.create({ name: "Loisirs", color: "#275DAD" });
    expect(request).toHaveBeenLastCalledWith("/operation-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Loisirs", color: "#275DAD" }),
    });

    await gateway.update(9, { name: "Loisirs", color: null });
    // Sans `icon`, le backend conserve l'icône existante.
    expect(request).toHaveBeenLastCalledWith("/operation-categories/9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Loisirs", color: null }),
    });
  });

  it("deletes and exposes the stable error code of a refusal", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        json(409, {
          error: {
            type: "Conflict",
            message: "Resource conflict",
            details: { code: "CATEGORY_IN_USE" },
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const gateway = new HttpCategoriesGateway({ request });

    await expect(gateway.remove(9)).resolves.toBeUndefined();
    expect(request).toHaveBeenNthCalledWith(1, "/operation-categories/9", {
      method: "DELETE",
    });
    await expect(gateway.remove(9)).rejects.toMatchObject({
      status: 409,
      code: "CATEGORY_IN_USE",
    });
    const missing = await gateway.remove(9).catch((error: unknown) => error);
    expect(missing).toBeInstanceOf(CategoryRequestError);
    expect(missing).toMatchObject({ status: 404, code: "CATEGORY_NOT_FOUND" });
  });

  it("refuses an invalid id or response before using it", async () => {
    const request = vi.fn().mockResolvedValue(json(201, { data: { id: 9 } }));
    const gateway = new HttpCategoriesGateway({ request });
    await expect(gateway.update(0, saved)).rejects.toThrow();
    await expect(gateway.create(saved)).rejects.toThrow(
      "Invalid category response",
    );
  });
});

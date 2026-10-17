import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  categoryErrorCode,
  categoryService,
} from "../../src/js/services/categoryService";
import { apiPrivate } from "../../src/utils/axiosHelper";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const saved = { id: 9, name: "Loisirs", color: "#275DAD", icon: null };

beforeEach(() => vi.clearAllMocks());

describe("categoryService", () => {
  it("creates a category and validates the returned contract", async () => {
    apiPrivate.post.mockResolvedValue({ data: { data: saved } });

    await expect(
      categoryService.create({ name: "Loisirs", color: "#275DAD" })
    ).resolves.toEqual({ id: 9, name: "Loisirs", color: "#275DAD" });
    expect(apiPrivate.post).toHaveBeenCalledWith(
      "/operation-categories",
      { name: "Loisirs", color: "#275DAD" },
      { withCredentials: true }
    );
  });

  it("updates name and color without sending the icon", async () => {
    apiPrivate.put.mockResolvedValue({ data: { data: saved } });

    await categoryService.update(9, {
      name: "Loisirs",
      color: null,
      icon: "solid:house",
    });
    // `icon` absent : le backend conserve l'icône existante.
    expect(apiPrivate.put).toHaveBeenCalledWith(
      "/operation-categories/9",
      { name: "Loisirs", color: null },
      { withCredentials: true }
    );
  });

  it("deletes a category by id", async () => {
    apiPrivate.delete.mockResolvedValue({ status: 204 });

    await categoryService.remove(9);
    expect(apiPrivate.delete).toHaveBeenCalledWith("/operation-categories/9", {
      withCredentials: true,
    });
  });

  it("refuses an invalid id or response before using it", async () => {
    await expect(categoryService.update(0, saved)).rejects.toThrow();
    await expect(categoryService.remove("9")).rejects.toThrow();
    apiPrivate.post.mockResolvedValue({ data: { data: { id: 9 } } });
    await expect(categoryService.create(saved)).rejects.toThrow();
  });

  it("extracts the stable API error code", () => {
    expect(
      categoryErrorCode({
        response: {
          status: 409,
          data: { error: { details: { code: "CATEGORY_IN_USE" } } },
        },
      })
    ).toBe("CATEGORY_IN_USE");
    expect(categoryErrorCode({ response: { status: 404 } })).toBe(
      "CATEGORY_NOT_FOUND"
    );
    expect(categoryErrorCode(new Error("network"))).toBeNull();
  });
});

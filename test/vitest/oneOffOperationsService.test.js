import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  oneOffOperationsService,
  OPERATIONS_PAGE_LIMIT,
  parseCategory,
  parseOperation,
} from "../../src/js/services/oneOffOperationsService";
import { apiPrivate } from "../../src/utils/axiosHelper";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const operation = {
  id: 7,
  title: "Courses",
  amount: "42.50",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: "2026-08-18",
  categoryId: 2,
};

const page = (
  data,
  meta = { limit: 20, hasNext: false, nextCursor: null }
) => ({
  data: { data, meta },
});

beforeEach(() => vi.clearAllMocks());

describe("oneOffOperationsService", () => {
  it("requests a bounded first page and validates its contract", async () => {
    apiPrivate.get.mockResolvedValue(page([operation]));

    await expect(oneOffOperationsService.listOperations()).resolves.toEqual({
      data: [operation],
      meta: { limit: 20, hasNext: false, nextCursor: null },
    });
    expect(apiPrivate.get).toHaveBeenCalledWith("/operations", {
      params: { limit: OPERATIONS_PAGE_LIMIT },
      withCredentials: true,
    });
  });

  it("passes the opaque cursor without interpreting it", async () => {
    apiPrivate.get.mockResolvedValue(page([]));
    await oneOffOperationsService.listOperations("v1.opaque");
    expect(apiPrivate.get).toHaveBeenCalledWith("/operations", {
      params: { limit: OPERATIONS_PAGE_LIMIT, cursor: "v1.opaque" },
      withCredentials: true,
    });
  });

  it("loads every category page and rejects a repeated cursor", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(
        page([{ id: 1, name: "Courses", color: "#00AA00" }], {
          limit: 100,
          hasNext: true,
          nextCursor: "next",
        })
      )
      .mockResolvedValueOnce(
        page([{ id: 2, name: "Loisirs", color: null }], {
          limit: 100,
          hasNext: false,
          nextCursor: null,
        })
      );
    await expect(
      oneOffOperationsService.listAllCategories()
    ).resolves.toHaveLength(2);

    apiPrivate.get.mockReset();
    apiPrivate.get.mockResolvedValue(
      page([], { limit: 100, hasNext: true, nextCursor: "same" })
    );
    await expect(oneOffOperationsService.listAllCategories()).rejects.toThrow(
      "Repeated category cursor"
    );
  });

  it("rejects malformed public DTOs", () => {
    expect(() => parseOperation({ ...operation, amount: 42.5 })).toThrow(
      "Invalid operation response"
    );
    expect(() => parseCategory({ id: 1, name: "X", color: "red" })).toThrow(
      "Invalid category response"
    );
  });

  it("keeps only the documented public DTO fields", () => {
    const parsed = parseOperation({ ...operation, ownerId: 3 });
    expect(parsed).toEqual(operation);
    expect(parsed).not.toHaveProperty("ownerId");
  });

  it("uses the CRUD routes without adding owner fields", async () => {
    const body = {
      title: "Courses",
      amount: "42.50",
      currency: "EUR",
      kind: "DEPENSE",
      operationDate: "2026-08-18",
      categoryId: 2,
    };
    apiPrivate.post.mockResolvedValue({ data: { data: operation } });
    apiPrivate.put.mockResolvedValue({ data: { data: operation } });
    apiPrivate.delete.mockResolvedValue({ status: 204 });

    await oneOffOperationsService.createOperation(body);
    await oneOffOperationsService.updateOperation(7, body);
    await oneOffOperationsService.deleteOperation(7);

    expect(apiPrivate.post).toHaveBeenCalledWith("/operations", body, {
      withCredentials: true,
    });
    expect(apiPrivate.put).toHaveBeenCalledWith("/operations/7", body, {
      withCredentials: true,
    });
    expect(apiPrivate.delete).toHaveBeenCalledWith("/operations/7", {
      withCredentials: true,
    });
    expect(body).not.toHaveProperty("ownerId");
  });
});

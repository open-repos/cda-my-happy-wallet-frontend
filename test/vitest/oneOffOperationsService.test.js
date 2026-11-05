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
      paramsSerializer: { indexes: null },
      withCredentials: true,
    });
  });

  it("passes the opaque cursor without interpreting it", async () => {
    apiPrivate.get.mockResolvedValue(page([]));
    await oneOffOperationsService.listOperations("v1.opaque");
    expect(apiPrivate.get).toHaveBeenCalledWith("/operations", {
      params: { limit: OPERATIONS_PAGE_LIMIT, cursor: "v1.opaque" },
      paramsSerializer: { indexes: null },
      withCredentials: true,
    });
  });

  it("sends sort and filters with repeated categoryId values (#361)", async () => {
    apiPrivate.get.mockResolvedValue(page([]));
    await oneOffOperationsService.listOperations(null, {
      sort: "amount",
      order: "desc",
      categoryId: ["3", "7"],
    });
    const config = apiPrivate.get.mock.calls[0][1];
    expect(config.params).toEqual({
      sort: "amount",
      order: "desc",
      categoryId: ["3", "7"],
      limit: OPERATIONS_PAGE_LIMIT,
    });
    // Sérialisation réelle d'axios : une clé répétée, sans crochets.
    const { default: axios } = await vi.importActual("axios");
    expect(
      axios.getUri({
        url: "/operations",
        params: config.params,
        paramsSerializer: config.paramsSerializer,
      })
    ).toBe(
      "/operations?sort=amount&order=desc&categoryId=3&categoryId=7&limit=20"
    );
  });

  it("maps title suggestions to filter options and forwards the abort signal (#174)", async () => {
    const controller = new AbortController();
    apiPrivate.get.mockResolvedValue({
      data: {
        data: [{ title: "Loyer" }, { title: "Électricité" }],
        meta: { limit: 10, hasNext: true, nextCursor: "c2" },
      },
    });
    const result = await oneOffOperationsService.listTitleSuggestions({
      query: "  lo ",
      cursor: "c1",
      limit: 10,
      signal: controller.signal,
    });
    expect(apiPrivate.get).toHaveBeenCalledWith(
      "/operations/suggestions/titles",
      {
        params: { q: "lo", limit: 10, cursor: "c1" },
        signal: controller.signal,
        withCredentials: true,
      }
    );
    expect(result).toEqual({
      data: [
        { value: "Loyer", label: "Loyer" },
        { value: "Électricité", label: "Électricité" },
      ],
      meta: { limit: 10, hasNext: true, nextCursor: "c2" },
    });
    apiPrivate.get.mockResolvedValue({
      data: {
        data: [{ title: "" }],
        meta: { limit: 10, hasNext: false, nextCursor: null },
      },
    });
    await expect(
      oneOffOperationsService.listTitleSuggestions({ query: "" })
    ).rejects.toThrow("Invalid title suggestion response");
    expect(apiPrivate.get).toHaveBeenLastCalledWith(
      "/operations/suggestions/titles",
      { params: { limit: 10 }, signal: undefined, withCredentials: true }
    );
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
    expect(() =>
      parseCategory({ id: 1, name: "Loisirs", color: null, icon: "github" })
    ).toThrow("Invalid category response");
  });

  it("exposes the category icon, null when the API omits it", () => {
    expect(
      parseCategory({
        id: 1,
        name: "Loisirs",
        color: null,
        icon: "regular:heart",
      })
    ).toEqual({ id: 1, name: "Loisirs", color: null, icon: "regular:heart" });
    expect(parseCategory({ id: 1, name: "Loisirs", color: null })).toEqual({
      id: 1,
      name: "Loisirs",
      color: null,
      icon: null,
    });
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

describe("oneOffOperationsService.listAllOperations", () => {
  const filter = { from: "2026-10-01", to: "2026-10-31", currency: "EUR" };

  it("follows every page of the filtered period", async () => {
    apiPrivate.get
      .mockResolvedValueOnce(
        page([operation], { limit: 100, hasNext: true, nextCursor: "c1" })
      )
      .mockResolvedValueOnce(page([{ ...operation, id: 8 }]));

    const operations = await oneOffOperationsService.listAllOperations(filter);

    expect(operations.map((item) => item.id)).toEqual([7, 8]);
    expect(apiPrivate.get).toHaveBeenNthCalledWith(1, "/operations", {
      params: { ...filter, limit: 100 },
      withCredentials: true,
    });
    expect(apiPrivate.get).toHaveBeenNthCalledWith(2, "/operations", {
      params: { ...filter, limit: 100, cursor: "c1" },
      withCredentials: true,
    });
  });

  it("stops on a repeated cursor", async () => {
    apiPrivate.get.mockResolvedValue(
      page([operation], { limit: 100, hasNext: true, nextCursor: "loop" })
    );

    await expect(
      oneOffOperationsService.listAllOperations(filter)
    ).rejects.toThrow("Repeated operation cursor");
  });
});

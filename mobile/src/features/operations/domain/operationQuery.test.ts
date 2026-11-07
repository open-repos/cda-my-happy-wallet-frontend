import { describe, expect, it } from "vitest";
import {
  emptyOperationQuery,
  normalizeQueryAmount,
  operationRequestFilter,
  validateOperationQuery,
} from "./operationQuery";

describe("operation list query matches the Web contract", () => {
  it("keeps the default server order and omits empty filters", () => {
    expect(operationRequestFilter(emptyOperationQuery())).toEqual({});
  });
  it("sends one sort and AND filters, with category alternatives", () => {
    expect(
      operationRequestFilter({
        ...emptyOperationQuery(),
        sort: { field: "amount", order: "asc" },
        from: "2026-11-01",
        to: "2026-11-30",
        title: "  Café  ",
        categoryIds: [4, 2, 4],
        type: "DEPENSE",
        minAmount: "0,30",
        maxAmount: "12,5",
      }),
    ).toEqual({
      sort: "amount",
      order: "asc",
      from: "2026-11-01",
      to: "2026-11-30",
      title: "Café",
      categoryId: [2, 4],
      type: "DEPENSE",
      minAmount: "0.30",
      maxAmount: "12.50",
    });
  });
  it.each(["-1", "1e3", "1.234", "100000000", "01", "abc"])(
    "rejects invalid amount %s",
    (amount) => {
      expect(normalizeQueryAmount(amount)).toBeNull();
    },
  );
  it("accepts zero and the API maximum without float arithmetic", () => {
    expect(normalizeQueryAmount("0")).toBe("0.00");
    expect(normalizeQueryAmount("99999999,99")).toBe("99999999.99");
  });
  it("rejects impossible dates, inverted ranges and invalid categories", () => {
    expect(
      validateOperationQuery({ ...emptyOperationQuery(), from: "2026-02-30" }),
    ).toHaveProperty("dates");
    expect(
      validateOperationQuery({
        ...emptyOperationQuery(),
        from: "2026-11-30",
        to: "2026-11-01",
      }),
    ).toHaveProperty("dates");
    expect(
      validateOperationQuery({
        ...emptyOperationQuery(),
        minAmount: "12,51",
        maxAmount: "12,50",
      }),
    ).toHaveProperty("amounts");
    expect(
      validateOperationQuery({ ...emptyOperationQuery(), categoryIds: [0] }),
    ).toHaveProperty("categories");
    expect(
      validateOperationQuery({
        ...emptyOperationQuery(),
        categoryIds: Array.from({ length: 21 }, (_, i) => i + 1),
      }),
    ).toHaveProperty("categories");
  });
  it("accepts free text up to 50 characters and refuses invalid drafts before requests", () => {
    expect(
      validateOperationQuery({
        ...emptyOperationQuery(),
        title: "é".repeat(50),
      }),
    ).toEqual({});
    expect(() =>
      operationRequestFilter({
        ...emptyOperationQuery(),
        title: "é".repeat(51),
      }),
    ).toThrow();
  });
});

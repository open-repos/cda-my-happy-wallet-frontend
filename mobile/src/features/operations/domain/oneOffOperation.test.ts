import { describe, expect, it } from "vitest";

import {
  parseCategory,
  parseCollectionPage,
  parseOperation,
  toOperationPayload,
  validateOperationDraft,
} from "@/src/features/operations/domain/oneOffOperation";

const operation = {
  id: 7,
  title: "Courses",
  amount: "42.50",
  currency: "EUR",
  type: "DEPENSE" as const,
  operationDate: "2026-08-22",
  categoryId: 2,
};

describe("one-off operation domain", () => {
  it("keeps only the public operation fields", () => {
    expect(parseOperation({ ...operation, ownerId: 99 })).toEqual(operation);
  });

  it("rejects malformed DTOs and pagination metadata", () => {
    expect(() => parseOperation({ ...operation, amount: 42.5 })).toThrow();
    expect(() => parseCategory({ id: 2, name: "X", color: "red" })).toThrow();
    expect(() =>
      parseCollectionPage(
        {
          data: [operation],
          meta: { limit: 20, hasNext: true, nextCursor: null },
        },
        parseOperation,
      ),
    ).toThrow();
  });

  it("validates and normalizes an editable draft", () => {
    const draft = {
      title: "  Courses ",
      amount: "42,5",
      operationDate: "2026-08-22",
      categoryId: 2,
      kind: "DEPENSE" as const,
    };
    expect(validateOperationDraft(draft, new Set([2]))).toEqual({});
    expect(toOperationPayload(draft)).toEqual({
      title: "Courses",
      amount: "42.50",
      currency: "EUR",
      kind: "DEPENSE",
      operationDate: "2026-08-22",
      categoryId: 2,
    });
  });
});

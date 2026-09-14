import { describe, expect, it } from "vitest";

import {
  parseFixedOperationPage,
  summarizeFixedBudget,
  toFixedOperationPayload,
  validateFixedOperationDraft,
} from "@/src/features/dashboard/domain/fixedBudget";

describe("fixed budget", () => {
  it("parses a paginated backend response", () => {
    expect(
      parseFixedOperationPage({
        data: [
          {
            idOperationFixe: 7,
            titre: "Salaire",
            montant: "1800.50",
            devise: "EUR",
            typeOperation: "REVENU",
          },
        ],
        meta: { limit: 50, hasNext: false, nextCursor: null },
      }).data[0],
    ).toEqual({
      id: 7,
      title: "Salaire",
      amount: "1800.50",
      currency: "EUR",
      type: "REVENU",
    });
  });

  it("rejects a malformed collection", () => {
    expect(() =>
      parseFixedOperationPage({ data: [], meta: { hasNext: false } }),
    ).toThrow("Invalid fixed operation collection");
  });

  it("calculates the monthly remaining amount without decimal drift", () => {
    expect(
      summarizeFixedBudget([
        {
          id: 1,
          title: "Salaire",
          amount: "2000.10",
          currency: "EUR",
          type: "REVENU",
        },
        {
          id: 2,
          title: "Loyer",
          amount: "800.20",
          currency: "EUR",
          type: "CHARGE",
        },
      ]),
    ).toEqual({ expenses: 800.2, income: 2000.1, remaining: 1199.9 });
  });

  it("validates and normalizes a fixed operation draft", () => {
    const draft = {
      title: " Salaire ",
      amount: "2200,5",
      type: "REVENU",
    } as const;

    expect(validateFixedOperationDraft(draft)).toEqual({});
    expect(toFixedOperationPayload(draft)).toEqual({
      titre: "Salaire",
      montant: "2200.50",
      devise: "EUR",
    });
  });

  it("rejects a short label and an amount below the backend minimum", () => {
    expect(
      validateFixedOperationDraft({
        title: "A",
        amount: "0,50",
        type: "CHARGE",
      }),
    ).toEqual({
      title: "Le libellé doit contenir entre 2 et 50 caractères.",
      amount:
        "Saisissez un montant d’au moins 1 € avec deux décimales maximum.",
    });
  });
});

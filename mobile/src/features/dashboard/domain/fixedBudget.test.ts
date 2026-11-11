import { describe, expect, it } from "vitest";

import {
  compatibleFixedCategories,
  effectiveMonthOptions,
  envelopeAvailable,
  FIXED_CATEGORY_UNAVAILABLE_MESSAGE,
  fixedCategoryLabel,
  fixedCategoryOptions,
  parseFixedOperation,
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
      categoryId: null,
      category: null,
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
          categoryId: null,
          category: null,
        },
        {
          id: 2,
          title: "Loyer",
          amount: "800.20",
          currency: "EUR",
          type: "CHARGE",
          categoryId: null,
          category: null,
        },
      ]),
    ).toEqual({ expenses: 800.2, income: 2000.1, remaining: 1199.9 });
  });

  it("validates and normalizes a fixed operation draft", () => {
    const draft = {
      title: " Salaire ",
      amount: "2200,5",
      type: "REVENU",
      categoryId: null,
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
        categoryId: null,
      }),
    ).toEqual({
      title: "Le libellé doit contenir entre 2 et 50 caractères.",
      amount:
        "Saisissez un montant d’au moins 1 € avec deux décimales maximum.",
    });
  });

  describe("categories (#385)", () => {
    const backendRow = {
      idOperationFixe: 3,
      titre: "Loyer",
      montant: "900.00",
      devise: "EUR",
      typeOperation: "CHARGE",
    };
    const housing = {
      id: 21,
      name: "Logement",
      color: null,
      icon: "solid:house",
      fixedKind: "CHARGE",
    } as const;
    const salaries = {
      id: 22,
      name: "Salaires",
      color: null,
      icon: "solid:money-bill-wave",
      fixedKind: "REVENU",
    } as const;
    const food = { id: 4, name: "Alimentation", color: "#EA7C69", icon: null };

    it("reads the category returned by the backend", () => {
      expect(
        parseFixedOperation({
          ...backendRow,
          categoryId: 21,
          category: housing,
        }),
      ).toMatchObject({ categoryId: 21, category: housing });
    });

    it("keeps an assignment whose category object is missing", () => {
      expect(
        parseFixedOperation({ ...backendRow, categoryId: 21, category: null }),
      ).toMatchObject({ categoryId: 21, category: null });
    });

    it("rejects an invalid category reference", () => {
      expect(() =>
        parseFixedOperation({ ...backendRow, categoryId: "21" }),
      ).toThrow("Invalid fixed operation response");
      expect(() =>
        parseFixedOperation({
          ...backendRow,
          categoryId: 21,
          category: { ...housing, fixedKind: "AUTRE" },
        }),
      ).toThrow();
    });

    it("labels uncategorized and unavailable categories like the Web", () => {
      expect(fixedCategoryLabel({ categoryId: null, category: null })).toBe(
        "Non catégorisé",
      );
      expect(fixedCategoryLabel({ categoryId: 21, category: null })).toBe(
        "Catégorie indisponible",
      );
      expect(fixedCategoryLabel({ categoryId: 21, category: housing })).toBe(
        "Logement",
      );
    });

    it("offers only categories compatible with the fixed operation type", () => {
      const catalog = [housing, salaries, food];
      expect(compatibleFixedCategories(catalog, "CHARGE")).toEqual([
        housing,
        food,
      ]);
      expect(compatibleFixedCategories(catalog, "REVENU")).toEqual([
        salaries,
        food,
      ]);
    });

    it("keeps the current category visible even when it is no longer offered", () => {
      expect(
        fixedCategoryOptions([food], "CHARGE", {
          categoryId: 21,
          category: housing,
        }),
      ).toEqual([housing, food]);
      expect(
        fixedCategoryOptions([housing, food], "CHARGE", {
          categoryId: 21,
          category: housing,
        }),
      ).toEqual([housing, food]);
    });

    it("sends a chosen category on creation only", () => {
      expect(
        toFixedOperationPayload({
          title: "Loyer",
          amount: "900",
          type: "CHARGE",
          categoryId: 21,
        }),
      ).toEqual({
        titre: "Loyer",
        montant: "900.00",
        devise: "EUR",
        categoryId: 21,
      });
      expect(
        toFixedOperationPayload({
          title: "Loyer",
          amount: "900",
          type: "CHARGE",
          categoryId: null,
        }),
      ).not.toHaveProperty("categoryId");
    });

    it("sends the category on update only when it changed, null to remove it", () => {
      const current = { categoryId: 21 };
      const draft = {
        title: "Loyer",
        amount: "900",
        type: "CHARGE",
      } as const;
      expect(
        toFixedOperationPayload({ ...draft, categoryId: 21 }, current),
      ).not.toHaveProperty("categoryId");
      expect(
        toFixedOperationPayload({ ...draft, categoryId: null }, current),
      ).toMatchObject({ categoryId: null });
      expect(
        toFixedOperationPayload({ ...draft, categoryId: 4 }, current),
      ).toMatchObject({ categoryId: 4 });
    });

    it("rejects a newly chosen category absent from the loaded catalog", () => {
      const draft = {
        title: "Loyer",
        amount: "900",
        type: "CHARGE",
        categoryId: 22,
      } as const;
      expect(
        validateFixedOperationDraft(draft, {
          available: [housing, food],
          current: { categoryId: null },
        }),
      ).toEqual({ categoryId: FIXED_CATEGORY_UNAVAILABLE_MESSAGE });
      expect(
        validateFixedOperationDraft(
          { ...draft, categoryId: 21 },
          { available: [food], current: { categoryId: 21 } },
        ),
      ).toEqual({});
    });
  });
});

describe("fixed budget envelopes (#389, Web #314)", () => {
  const charge = {
    title: "Courses",
    amount: "300",
    type: "CHARGE" as const,
    categoryId: null,
  };

  it("reads the envelope flag and rejects a malformed one", () => {
    const row = {
      idOperationFixe: 3,
      titre: "Courses",
      montant: "300.00",
      devise: "EUR",
      typeOperation: "CHARGE",
      periodicite: "MENSUELLE",
    };
    expect(
      parseFixedOperation({ ...row, isBudgetEnvelope: true }),
    ).toMatchObject({ isBudgetEnvelope: true });
    expect(
      parseFixedOperation({ ...row, isBudgetEnvelope: false }),
    ).not.toHaveProperty("isBudgetEnvelope");
    expect(() =>
      parseFixedOperation({ ...row, isBudgetEnvelope: "yes" }),
    ).toThrow();
  });

  it("offers the envelope mode to monthly charges only", () => {
    expect(envelopeAvailable("CHARGE", undefined)).toBe(true);
    expect(envelopeAvailable("CHARGE", "MENSUELLE")).toBe(true);
    expect(envelopeAvailable("CHARGE", "ANNUELLE")).toBe(false);
    expect(envelopeAvailable("REVENU", "MENSUELLE")).toBe(false);
  });

  it("sends the flag and the effective month only when they change", () => {
    expect(
      toFixedOperationPayload({ ...charge, isBudgetEnvelope: true }),
    ).toMatchObject({ isBudgetEnvelope: true });
    expect(
      toFixedOperationPayload({ ...charge, isBudgetEnvelope: false }),
    ).not.toHaveProperty("isBudgetEnvelope");
    const current = { categoryId: null, isBudgetEnvelope: true as const };
    expect(
      toFixedOperationPayload({ ...charge, isBudgetEnvelope: true }, current),
    ).not.toHaveProperty("isBudgetEnvelope");
    expect(
      toFixedOperationPayload({ ...charge, isBudgetEnvelope: false }, current),
    ).toMatchObject({ isBudgetEnvelope: false });
    expect(
      toFixedOperationPayload(
        { ...charge, effectiveMonth: "2026-12" },
        { categoryId: null },
      ),
    ).toMatchObject({ effectiveMonth: "2026-12" });
    // Une entrée n'accepte pas le drapeau (backend : `forbidden`).
    expect(
      toFixedOperationPayload({
        ...charge,
        type: "REVENU",
        isBudgetEnvelope: true,
      }),
    ).not.toHaveProperty("isBudgetEnvelope");
  });

  it("lists the current month and the 23 next ones", () => {
    const months = effectiveMonthOptions("2026-11");
    expect(months).toHaveLength(24);
    expect(months[0]).toBe("2026-11");
    expect(months[1]).toBe("2026-12");
    expect(months[23]).toBe("2028-10");
  });
});

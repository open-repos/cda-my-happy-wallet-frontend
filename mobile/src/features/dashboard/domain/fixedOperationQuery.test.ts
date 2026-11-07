import { describe, expect, it } from "vitest";
import { parseFixedOperation } from "./fixedBudget";
import {
  emptyFixedQuery,
  queryFixedOperations,
  FIXED_SORT_CHOICES,
} from "./fixedOperationQuery";

const charge = (id: number, title: string, amount: string, extra = {}) =>
  parseFixedOperation({
    idOperationFixe: id,
    titre: title,
    montant: amount,
    devise: "EUR",
    typeOperation: "CHARGE",
    periodicite: "ANNUELLE",
    pourcentagePersonnel: "50.00",
    montantPersonnel: "60.00",
    montantMensuelPersonnel: "5.00",
    categoryId: 2,
    category: { id: 2, name: "Logement", color: null },
    ...extra,
  });

describe("fixed budget local query parity", () => {
  it.each([
    ["titre", [1, 2]],
    ["kind", [2, 1]],
    ["category", [1, 2]],
    ["montant", [2, 1]],
    ["devise", [1, 2]],
    ["periodicite", [1, 2]],
    ["pourcentagePersonnel", [2, 1]],
    ["montantPersonnel", [2, 1]],
    ["montantMensuelPersonnel", [2, 1]],
  ] as const)(
    "matches Web ordering for %s in both directions",
    (field, ascending) => {
      const rows = [
        charge(2, "Beta", "10.00", {
          devise: "USD",
          periodicite: "ANNUELLE",
          pourcentagePersonnel: "20.00",
          montantPersonnel: "8.00",
          montantMensuelPersonnel: "1.00",
          category: { id: 2, name: "Zoo", color: null },
        }),
        charge(1, "Alpha", "20.00", {
          typeOperation: "REVENU",
          periodicite: undefined,
          pourcentagePersonnel: undefined,
          category: { id: 2, name: "Alimentation", color: null },
        }),
      ];
      expect(
        queryFixedOperations(rows, {
          ...emptyFixedQuery(),
          sort: { field, order: "asc" },
        }).map((row) => row.id),
      ).toEqual(ascending);
      // Income has no personal-share percentage: unavailable values stay last.
      const descending =
        field === "pourcentagePersonnel"
          ? [...ascending]
          : [...ascending].reverse();
      expect(
        queryFixedOperations(rows, {
          ...emptyFixedQuery(),
          sort: { field, order: "desc" },
        }).map((row) => row.id),
      ).toEqual(descending);
    },
  );
  it("rejects malformed added API metadata instead of inventing sort values", () => {
    for (const extra of [
      { periodicite: "HEBDOMADAIRE" },
      { categoryId: -1 },
      { montantPersonnel: "NaN" },
      { pourcentagePersonnel: {} },
    ]) {
      expect(() => charge(1, "Charge", "120.00", extra)).toThrow(
        "Invalid fixed operation response",
      );
    }
  });
  it("preserves category, period and authoritative amounts from the API", () => {
    expect(charge(1, "Électricité", "120.00")).toMatchObject({
      categoryId: 2,
      category: { name: "Logement" },
      period: "ANNUELLE",
      share: "50.00",
      personalAmount: "60.00",
      monthlyPersonalAmount: "5.00",
    });
  });
  it("combines accent-insensitive free text, category OR, kind and period with AND", () => {
    const rows = [
      charge(1, "Électricité", "120.00"),
      charge(2, "Téléphone", "80.00"),
      charge(3, "Électricité garage", "90.00", {
        categoryId: 3,
        category: null,
      }),
    ];
    expect(
      queryFixedOperations(rows, {
        ...emptyFixedQuery(),
        title: "ELECTRICITE",
        categoryIds: ["2", "8"],
        kind: "charge",
        period: "ANNUELLE",
      }).map((x) => x.id),
    ).toEqual([1]);
    expect(rows).toHaveLength(3);
  });
  it("loads the same nine sort choices as Web", () => {
    expect(FIXED_SORT_CHOICES.map((x) => x.value)).toEqual([
      "titre",
      "kind",
      "category",
      "montant",
      "devise",
      "periodicite",
      "pourcentagePersonnel",
      "montantPersonnel",
      "montantMensuelPersonnel",
    ]);
  });
  it("sorts default by server monthly personal amount, without recalculating", () => {
    const rows = [
      charge(1, "Alpha", "900.00", { montantMensuelPersonnel: "5.00" }),
      charge(2, "Beta", "100.00", { montantMensuelPersonnel: "9.00" }),
    ];
    expect(
      queryFixedOperations(rows, emptyFixedQuery()).map((x) => x.id),
    ).toEqual([2, 1]);
    expect(
      queryFixedOperations(rows, {
        ...emptyFixedQuery(),
        sort: { field: "montant", order: "desc" },
      }).map((x) => x.id),
    ).toEqual([1, 2]);
    expect(rows.map((x) => x.id)).toEqual([1, 2]);
  });
  it("keeps unavailable calculated amounts last in both directions and breaks ties deterministically", () => {
    const rows = [
      charge(3, "Zèbre", "10.00", { montantMensuelPersonnel: null }),
      charge(2, "Alpha", "10.00"),
      charge(1, "Alpha", "10.00"),
    ];
    for (const order of ["asc", "desc"] as const) {
      expect(
        queryFixedOperations(rows, {
          ...emptyFixedQuery(),
          sort: { field: "montantMensuelPersonnel", order },
        }).map((x) => x.id),
      ).toEqual([1, 2, 3]);
    }
  });
  it("handles uncategorized legacy rows and monthly incomes like Web", () => {
    const income = parseFixedOperation({
      idOperationFixe: 5,
      titre: "Salaire",
      montant: "1800.00",
      devise: "EUR",
      typeOperation: "REVENU",
    });
    expect(
      queryFixedOperations([income, charge(1, "Charge", "120.00")], {
        ...emptyFixedQuery(),
        categoryIds: ["none"],
        period: "MENSUELLE",
        kind: "income",
      }),
    ).toEqual([income]);
  });
});

import { describe, expect, it } from "vitest";
import {
  FIXED_SORT_FIELDS,
  fixedOperationRows,
  sortFixedOperations,
} from "../../src/js/utils/fixedOperations";

const rows = fixedOperationRows(
  [
    {
      idOperationFixe: 7,
      titre: "Annuel",
      montant: "120",
      devise: "USD",
      periodicite: "ANNUELLE",
      pourcentagePersonnel: 50,
      montantPersonnel: "60.00",
      montantMensuelPersonnel: "5.01",
    },
    {
      idOperationFixe: 8,
      titre: "Bimestriel",
      montant: "20",
      devise: "EUR",
      periodicite: "BIMESTRIELLE",
      pourcentagePersonnel: 100,
      montantPersonnel: "20.00",
      montantMensuelPersonnel: "10.00",
    },
    { idOperationFixe: 9, titre: "Ancien", montant: "2", devise: "EUR" },
  ],
  [{ idOperationFixe: 7, titre: "Salaire", montant: "2000", devise: "EUR" }]
);
describe("tri de tous les champs du budget fixe", () => {
  it.each([
    [
      "titre",
      ["Ancien", "Annuel", "Bimestriel", "Salaire"],
      ["Salaire", "Bimestriel", "Annuel", "Ancien"],
    ],
    [
      "kind",
      ["Ancien", "Annuel", "Bimestriel", "Salaire"],
      ["Salaire", "Ancien", "Annuel", "Bimestriel"],
    ],
    [
      "montant",
      ["Ancien", "Bimestriel", "Annuel", "Salaire"],
      ["Salaire", "Annuel", "Bimestriel", "Ancien"],
    ],
    [
      "devise",
      ["Ancien", "Bimestriel", "Salaire", "Annuel"],
      ["Annuel", "Ancien", "Bimestriel", "Salaire"],
    ],
    [
      "periodicite",
      ["Ancien", "Salaire", "Bimestriel", "Annuel"],
      ["Annuel", "Bimestriel", "Ancien", "Salaire"],
    ],
    [
      "pourcentagePersonnel",
      ["Annuel", "Ancien", "Bimestriel", "Salaire"],
      ["Ancien", "Bimestriel", "Annuel", "Salaire"],
    ],
    [
      "montantPersonnel",
      ["Ancien", "Bimestriel", "Annuel", "Salaire"],
      ["Salaire", "Annuel", "Bimestriel", "Ancien"],
    ],
    [
      "montantMensuelPersonnel",
      ["Ancien", "Annuel", "Bimestriel", "Salaire"],
      ["Salaire", "Bimestriel", "Annuel", "Ancien"],
    ],
  ])("trie %s avec la bonne sémantique", (field, titles, reverseTitles) => {
    expect(
      sortFixedOperations(rows, field, "asc").map((row) => row.titre)
    ).toEqual(titles);
    const reverse = sortFixedOperations(rows, field, "desc");
    expect(reverse.map((row) => row.titre)).toEqual(reverseTitles);
    if (field === "pourcentagePersonnel")
      expect(reverse.at(-1).titre).toBe("Salaire");
  });
  it("trie les catégories par nom dans les deux sens, avec les valeurs inconnues à la fin", () => {
    const items = [
      {
        key: "charge:1",
        titre: "A",
        categoryId: 10,
        category: { name: "Logement" },
      },
      {
        key: "income:2",
        titre: "B",
        categoryId: 11,
        category: { name: "Aides et allocations" },
      },
      { key: "charge:3", titre: "C", categoryId: 999 },
      { key: "charge:4", titre: "D", categoryId: null },
    ];
    expect(
      sortFixedOperations(items, "category", "asc").map((r) => r.titre)
    ).toEqual(["B", "A", "D", "C"]);
    expect(
      sortFixedOperations(items, "category", "desc").map((r) => r.titre)
    ).toEqual(["D", "A", "B", "C"]);
  });
  it("garde les inconnues à la fin dans les deux sens et ne recalcule pas les montants absents", () => {
    const unknown = fixedOperationRows(
      [
        {
          idOperationFixe: 11,
          titre: "Inconnue",
          montant: "120",
          periodicite: "ANNUELLE",
          pourcentagePersonnel: 50,
        },
      ],
      []
    )[0];
    expect(unknown.montantMensuelPersonnel).toBeNull();
    for (const direction of ["asc", "desc"])
      expect(
        sortFixedOperations(
          [...rows, unknown],
          "montantMensuelPersonnel",
          direction
        ).at(-1)
      ).toBe(unknown);
  });
  it("préserve les identifiants par type, les anciennes lignes et la précision des décimaux", () => {
    expect(new Set(rows.map((row) => row.key)).size).toBe(4);
    expect(rows.find((row) => row.titre === "Ancien")).toMatchObject({
      periodicite: "MENSUELLE",
      pourcentagePersonnel: 100,
      montantMensuelPersonnel: "2",
    });
    const close = [
      { key: "charge:1", titre: "A", montant: "9999999999999999.02" },
      { key: "charge:2", titre: "B", montant: "9999999999999999.01" },
    ];
    expect(sortFixedOperations(close, "montant", "asc")[0].titre).toBe("B");
    expect(close[0].titre).toBe("A");
    expect(FIXED_SORT_FIELDS).toHaveLength(9);
  });
});

import { describe, expect, it } from "vitest";
import {
  EMPTY_OPERATION_FILTERS,
  ariaSortOf,
  countActiveFilters,
  filterFixedRows,
  fixedQueryParams,
  mergeSearch,
  nextSort,
  normalizeAmount,
  operationApiParams,
  operationQueryParams,
  parseFixedQuery,
  parseOperationQuery,
  sortAnnouncement,
  sortButtonLabel,
} from "../../src/js/utils/tableQuery";

describe("tri depuis un en-tête (#361)", () => {
  it("alterne croissant, décroissant puis sans tri", () => {
    const asc = nextSort(null, "amount");
    expect(asc).toEqual({ field: "amount", order: "asc" });
    const desc = nextSort(asc, "amount");
    expect(desc).toEqual({ field: "amount", order: "desc" });
    expect(nextSort(desc, "amount")).toBeNull();
    // Un seul tri actif : une autre colonne repart en croissant.
    expect(nextSort(desc, "title")).toEqual({ field: "title", order: "asc" });
  });

  it("saute l'état identique à l'ordre par défaut sur sa colonne", () => {
    const byDate = { field: "date", order: "desc" };
    const asc = nextSort(null, "date", byDate);
    expect(asc).toEqual({ field: "date", order: "asc" });
    // Décroissant explicite = ordre par défaut : retour direct au défaut.
    expect(nextSort(asc, "date", byDate)).toBeNull();
    expect(nextSort(asc, "amount", byDate)).toEqual({
      field: "amount",
      order: "asc",
    });
    expect(sortButtonLabel("Date", asc, "date", byDate)).toBe(
      "Trier : Date, trié par ordre croissant. Activer pour revenir à l’ordre par défaut."
    );
  });

  it("reflète l'ordre par défaut dans aria-sort et le libellé accessible", () => {
    const byDate = { field: "date", order: "desc" };
    expect(ariaSortOf(null, "date", byDate)).toBe("descending");
    expect(ariaSortOf(null, "amount", byDate)).toBe("none");
    expect(ariaSortOf({ field: "amount", order: "asc" }, "date", byDate)).toBe(
      "none"
    );
    expect(sortButtonLabel("Date", null, "date", byDate)).toBe(
      "Trier : Date, trié par ordre décroissant (par défaut). Activer pour trier par ordre croissant."
    );
    expect(
      sortButtonLabel("Montant", { field: "amount", order: "desc" }, "amount")
    ).toBe(
      "Trier : Montant, trié par ordre décroissant. Activer pour revenir à l’ordre par défaut."
    );
    expect(sortButtonLabel("Libellé", null, "title", byDate)).toBe(
      "Trier : Libellé, non trié. Activer pour trier par ordre croissant."
    );
    expect(
      sortAnnouncement(
        { field: "title", order: "asc" },
        { title: "libellé" },
        "x"
      )
    ).toBe("Liste triée par libellé, ordre croissant.");
    expect(sortAnnouncement(null, {}, "les plus récentes d’abord")).toBe(
      "Liste dans l’ordre par défaut : les plus récentes d’abord."
    );
  });
});

describe("état des opérations dans l'URL", () => {
  it("lit et réécrit un état valide avec les noms de l'API", () => {
    const search =
      "sort=amount&order=desc&from=2026-10-01&to=2026-10-31&title=Loyer&categoryId=7&categoryId=3&categoryId=7&type=ENTREE&minAmount=12,5&maxAmount=100";
    const query = parseOperationQuery(search);
    expect(query).toEqual({
      sort: { field: "amount", order: "desc" },
      filters: {
        from: "2026-10-01",
        to: "2026-10-31",
        title: "Loyer",
        categoryIds: [3, 7],
        type: "ENTREE",
        minAmount: "12.50",
        maxAmount: "100.00",
      },
    });
    expect(operationQueryParams(query).toString()).toBe(
      "sort=amount&order=desc&from=2026-10-01&to=2026-10-31&title=Loyer&type=ENTREE&minAmount=12.50&maxAmount=100.00&categoryId=3&categoryId=7"
    );
    expect(operationApiParams(query)).toEqual({
      sort: "amount",
      order: "desc",
      from: "2026-10-01",
      to: "2026-10-31",
      title: "Loyer",
      type: "ENTREE",
      minAmount: "12.50",
      maxAmount: "100.00",
      categoryId: ["3", "7"],
    });
    expect(countActiveFilters(query.filters)).toBe(7);
  });

  it("ignore les valeurs que l'API refuserait en 422", () => {
    expect(
      parseOperationQuery(
        "sort=id&order=desc&from=2026-02-30&to=x&title=" +
          "a".repeat(51) +
          "&categoryId=0&categoryId=abc&type=CHARGE&minAmount=-1&maxAmount=1.234"
      )
    ).toEqual({ sort: null, filters: EMPTY_OPERATION_FILTERS });
    // Bornes inversées : aucune n'est appliquée.
    expect(
      parseOperationQuery(
        "from=2026-10-31&to=2026-10-01&minAmount=10&maxAmount=9"
      ).filters
    ).toEqual(EMPTY_OPERATION_FILTERS);
    // `order` seul n'a pas de sens ; `sort` seul est croissant.
    expect(parseOperationQuery("order=desc").sort).toBeNull();
    expect(parseOperationQuery("sort=title").sort).toEqual({
      field: "title",
      order: "asc",
    });
    expect(
      parseOperationQuery(
        Array.from({ length: 25 }, (_, i) => `categoryId=${i + 1}`).join("&")
      ).filters.categoryIds
    ).toHaveLength(20);
  });

  it("normalise un montant saisi au format de l'API", () => {
    expect(normalizeAmount("12,5")).toBe("12.50");
    expect(normalizeAmount(" 0 ")).toBe("0.00");
    expect(normalizeAmount("12.345")).toBeNull();
    expect(normalizeAmount("-3")).toBeNull();
    expect(normalizeAmount("")).toBeNull();
  });

  it("préserve les paramètres d'URL qui ne lui appartiennent pas", () => {
    expect(
      mergeSearch(
        "tab=2&sort=title&title=x",
        ["sort", "order", "title"],
        [
          ["sort", "amount"],
          ["order", "asc"],
        ]
      ).toString()
    ).toBe("tab=2&sort=amount&order=asc");
  });
});

describe("charges et entrées fixes, dans le navigateur", () => {
  const options = {
    sortFields: ["titre", "montant"],
    periods: ["MENSUELLE", "ANNUELLE"],
  };
  const rows = [
    {
      titre: "Électricité",
      kind: "charge",
      categoryId: 4,
      periodicite: "MENSUELLE",
    },
    {
      titre: "Assurance auto",
      kind: "charge",
      categoryId: null,
      periodicite: "ANNUELLE",
    },
    {
      titre: "Salaire",
      kind: "income",
      categoryId: 9,
      periodicite: "MENSUELLE",
    },
  ];
  const titles = (filters) =>
    filterFixedRows(rows, filters).map((r) => r.titre);

  it("combine les filtres en ET et les catégories en OU", () => {
    const none = parseFixedQuery("", options).filters;
    expect(titles(none)).toHaveLength(3);
    expect(titles({ ...none, title: "ELEC" })).toEqual(["Électricité"]);
    expect(titles({ ...none, categoryIds: ["none", "9"] })).toEqual([
      "Assurance auto",
      "Salaire",
    ]);
    expect(titles({ ...none, kind: "charge", period: "MENSUELLE" })).toEqual([
      "Électricité",
    ]);
  });

  it("lit et réécrit l'URL en ignorant les valeurs inconnues", () => {
    const query = parseFixedQuery(
      "sort=montant&order=desc&title=Loyer&categoryId=none&categoryId=4&categoryId=x&type=income&period=ANNUELLE",
      options
    );
    expect(query).toEqual({
      sort: { field: "montant", order: "desc" },
      filters: {
        title: "Loyer",
        categoryIds: ["none", "4"],
        kind: "income",
        period: "ANNUELLE",
      },
    });
    expect(fixedQueryParams(query).toString()).toBe(
      "sort=montant&order=desc&title=Loyer&categoryId=none&categoryId=4&type=income&period=ANNUELLE"
    );
    expect(parseFixedQuery("sort=devise&type=autre&period=X", options)).toEqual(
      {
        sort: null,
        filters: { title: "", categoryIds: [], kind: "", period: "" },
      }
    );
  });
});

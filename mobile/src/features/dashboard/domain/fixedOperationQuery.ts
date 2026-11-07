import type { FixedOperation } from "./fixedBudget";
import {
  foldQueryText,
  ListSort,
} from "@/src/features/operations/domain/operationQuery";

export const FIXED_PERIOD_CHOICES = [
  { value: "MENSUELLE", label: "Mensuelle" },
  { value: "BIMESTRIELLE", label: "Bimestrielle" },
  { value: "TRIMESTRIELLE", label: "Trimestrielle" },
  { value: "SEMESTRIELLE", label: "Semestrielle" },
  { value: "ANNUELLE", label: "Annuelle" },
] as const;
export type FixedPeriod = (typeof FIXED_PERIOD_CHOICES)[number]["value"];
export const FIXED_SORT_CHOICES = [
  { value: "titre", label: "Libellé" },
  { value: "kind", label: "Type" },
  { value: "category", label: "Catégorie" },
  { value: "montant", label: "Total / échéance" },
  { value: "devise", label: "Devise" },
  { value: "periodicite", label: "Périodicité" },
  { value: "pourcentagePersonnel", label: "Ma part (%)" },
  { value: "montantPersonnel", label: "Personnel / échéance" },
  { value: "montantMensuelPersonnel", label: "Personnel / mois" },
] as const;
export type FixedSortField = (typeof FIXED_SORT_CHOICES)[number]["value"];
export interface FixedQuery {
  sort: ListSort<FixedSortField> | null;
  title: string;
  categoryIds: string[];
  kind: "" | "charge" | "income";
  period: FixedPeriod | "";
}
export const emptyFixedQuery = (): FixedQuery => ({
  sort: null,
  title: "",
  categoryIds: [],
  kind: "",
  period: "",
});
export const fixedCategoryLabel = (row: FixedOperation): string =>
  row.category?.name ??
  (row.categoryId == null ? "Non catégorisé" : "Catégorie indisponible");
export const fixedPeriod = (row: FixedOperation): FixedPeriod =>
  row.type === "REVENU" ? "MENSUELLE" : (row.period ?? "MENSUELLE");
const legacy = (row: FixedOperation) => row.period == null && row.share == null;
const personalAmount = (row: FixedOperation) =>
  row.type === "REVENU"
    ? row.amount
    : (row.personalAmount ?? (legacy(row) ? row.amount : null));
const monthlyAmount = (row: FixedOperation) =>
  row.type === "REVENU"
    ? row.amount
    : (row.monthlyPersonalAmount ?? (legacy(row) ? row.amount : null));
const numericFields = new Set<FixedSortField>([
  "montant",
  "pourcentagePersonnel",
  "montantPersonnel",
  "montantMensuelPersonnel",
]);
const fieldValue = (
  row: FixedOperation,
  field: FixedSortField,
): string | number | null => {
  switch (field) {
    case "titre":
      return row.title;
    case "kind":
      return row.type === "REVENU" ? "Entrée" : "Charge";
    case "category":
      return (
        row.category?.name ?? (row.categoryId == null ? "Non catégorisé" : null)
      );
    case "montant":
      return row.amount;
    case "devise":
      return row.currency;
    case "periodicite":
      return {
        MENSUELLE: 1,
        BIMESTRIELLE: 2,
        TRIMESTRIELLE: 3,
        SEMESTRIELLE: 6,
        ANNUELLE: 12,
      }[fixedPeriod(row)];
    case "pourcentagePersonnel":
      return row.type === "REVENU" ? null : (row.share ?? "100");
    case "montantPersonnel":
      return personalAmount(row);
    case "montantMensuelPersonnel":
      return monthlyAmount(row);
  }
};
// Decimal comparison only: use authoritative amounts, with no financial calculation or currency conversion.
const compareDecimal = (left: string, right: string): number => {
  const [a, af = ""] = left.split(".");
  const [b, bf = ""] = right.split(".");
  const scale = Math.max(af.length, bf.length);
  const x = BigInt(a + af.padEnd(scale, "0"));
  const y = BigInt(b + bf.padEnd(scale, "0"));
  return x < y ? -1 : x > y ? 1 : 0;
};
export const queryFixedOperations = (
  rows: readonly FixedOperation[],
  query: FixedQuery,
): FixedOperation[] => {
  const sort = query.sort ?? {
    field: "montantMensuelPersonnel",
    order: "desc",
  };
  return rows
    .filter(
      (row) =>
        (!query.title ||
          foldQueryText(row.title).includes(
            foldQueryText(query.title.trim()),
          )) &&
        (!query.categoryIds.length ||
          query.categoryIds.includes(
            row.categoryId == null ? "none" : String(row.categoryId),
          )) &&
        (!query.kind ||
          query.kind === (row.type === "REVENU" ? "income" : "charge")) &&
        (!query.period || fixedPeriod(row) === query.period),
    )
    .sort((a, b) => {
      const left = fieldValue(a, sort.field);
      const right = fieldValue(b, sort.field);
      if (left == null || right == null) {
        if (left != null) return -1;
        if (right != null) return 1;
      } else {
        const order = numericFields.has(sort.field)
          ? compareDecimal(String(left), String(right))
          : typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), "fr", {
                sensitivity: "base",
              });
        if (order) return order * (sort.order === "asc" ? 1 : -1);
      }
      return (
        a.title.localeCompare(b.title, "fr", { sensitivity: "base" }) ||
        `${a.type === "REVENU" ? "income" : "charge"}:${a.id}`.localeCompare(
          `${b.type === "REVENU" ? "income" : "charge"}:${b.id}`,
          "fr",
          { numeric: true },
        )
      );
    });
};

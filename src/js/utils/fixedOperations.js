import { CHARGE_PERIODS, chargeDisplay } from "./fixedCharges";

export const FIXED_SORT_FIELDS = [
  { value: "titre", label: "Nom" },
  { value: "kind", label: "Type" },
  { value: "category", label: "Catégorie" },
  { value: "montant", label: "Total / échéance" },
  { value: "devise", label: "Devise" },
  { value: "periodicite", label: "Périodicité" },
  { value: "pourcentagePersonnel", label: "Ma part (%)" },
  { value: "montantPersonnel", label: "Personnel / échéance" },
  { value: "montantMensuelPersonnel", label: "Personnel / mois" },
];

export const fixedKindLabel = (kind) =>
  kind === "income" ? "Entrée" : "Charge";
export const fixedPeriodLabel = (period) =>
  CHARGE_PERIODS.find(({ value }) => value === period)?.label ?? "Indisponible";

export const fixedOperationRows = (charges, incomes) =>
  [
    ...charges.map((charge) => ({ ...chargeDisplay(charge), kind: "charge" })),
    ...incomes.map((income) => ({
      ...income,
      kind: "income",
      periodicite: "MENSUELLE",
      pourcentagePersonnel: null,
      montantPersonnel: income.montant,
      montantMensuelPersonnel: income.montant,
    })),
  ].map((row) => ({ ...row, key: `${row.kind}:${row.idOperationFixe}` }));

// Comparaison décimale uniquement : ni calcul de mensualisation ni conversion
// monétaire. BigInt évite de perdre des chiffres lors du tri de montants voisins.
const decimalParts = (value) => {
  if (value == null) return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(String(value));
  if (!match) return null;
  return [match[1], match[2] ?? ""];
};
const compareDecimals = (left, right) => {
  const scale = Math.max(left[1].length, right[1].length);
  const a = BigInt(left[0] + left[1].padEnd(scale, "0"));
  const b = BigInt(right[0] + right[1].padEnd(scale, "0"));
  return a < b ? -1 : a > b ? 1 : 0;
};

export const sortFixedOperations = (rows, field, direction) => {
  const numeric = [
    "montant",
    "pourcentagePersonnel",
    "montantPersonnel",
    "montantMensuelPersonnel",
  ].includes(field);
  const value = (row) =>
    field === "kind"
      ? fixedKindLabel(row.kind)
      : field === "periodicite"
      ? CHARGE_PERIODS.find(({ value }) => value === row.periodicite)?.months ??
        null
      : field === "category"
      ? row.category?.name ?? (row.categoryId == null ? "Non catégorisé" : null)
      : row[field];
  return [...rows].sort((a, b) => {
    const left = numeric ? decimalParts(value(a)) : value(a);
    const right = numeric ? decimalParts(value(b)) : value(b);
    if (left == null || right == null) {
      if (left != null) return -1;
      if (right != null) return 1;
    } else {
      const order = numeric
        ? compareDecimals(left, right)
        : typeof left === "number"
        ? left - right
        : String(left).localeCompare(String(right), "fr", {
            sensitivity: "base",
          });
      if (order) return order * (direction === "asc" ? 1 : -1);
    }
    return (
      a.titre.localeCompare(b.titre, "fr", { sensitivity: "base" }) ||
      a.key.localeCompare(b.key, "fr", { numeric: true })
    );
  });
};

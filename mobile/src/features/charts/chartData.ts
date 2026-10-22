import { money, toCents } from "@/src/features/budget/domain/budgetSummary";
import { paletteRanks } from "@/src/features/charts/categoryPalette";
import type {
  OneOffOperation,
  OperationCategory,
} from "@/src/features/operations/domain/oneOffOperation";

export interface Goal {
  id: number;
  title: string;
  currency: string;
  savedAmount: string;
  targetAmount: string;
}
export interface ChartRow {
  categoryId: number;
  name: string;
  cents: number;
  label: string;
  /** Icône Font Awesome de la catégorie (#132), affichée dans la liste. */
  icon: string | null;
  color: string | null;
  /** Rang parmi les catégories sans couleur : couleur de palette stable (#172). */
  paletteIndex: number;
}
export const expenseRows = (
  operations: OneOffOperation[],
  categories: OperationCategory[],
): ChartRow[] => {
  const totals = new Map<number, number>();
  for (const op of operations) {
    if (op.type === "DEPENSE" && op.currency === "EUR")
      totals.set(
        op.categoryId,
        (totals.get(op.categoryId) ?? 0) + toCents(op.amount),
      );
  }
  // Rang par identifiant parmi les catégories sans couleur propre (#172).
  const ranks = paletteRanks(categories);
  // Ordre stable entre deux montants égaux, comme sur le Web.
  return [...totals]
    .map(([id, cents]) => {
      const category = categories.find((c) => c.id === id);
      const name = category?.name ?? "Autre catégorie";
      return {
        categoryId: id,
        name,
        cents,
        label: `${name} : ${money(cents, "EUR")}`,
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        paletteIndex: ranks.get(id) ?? ranks.size,
      };
    })
    .sort((a, b) => b.cents - a.cents || a.categoryId - b.categoryId);
};
export const goalProgress = (goals: Goal[]) => {
  const rows = goals.filter((g) => g.currency === "EUR");
  const target = rows.reduce((n, g) => n + toCents(g.targetAmount), 0);
  const saved = rows.reduce(
    (n, g) => n + Math.min(toCents(g.savedAmount), toCents(g.targetAmount)),
    0,
  );
  const percent =
    target > 0 ? Math.min(100, Math.floor((saved * 100) / target)) : 0;
  return {
    percent,
    labels: rows.map(
      (g) =>
        `${g.title} : ${money(toCents(g.savedAmount), "EUR")} sur ${money(toCents(g.targetAmount), "EUR")}`,
    ),
  };
};
export const parseGoal = (value: unknown): Goal => {
  const g = value as Partial<Goal> | null;
  if (
    !g ||
    !Number.isInteger(g.id) ||
    Number(g.id) <= 0 ||
    typeof g.title !== "string" ||
    !g.title.trim() ||
    typeof g.currency !== "string" ||
    !/^[A-Z]{3}$/.test(g.currency) ||
    ![g.savedAmount, g.targetAmount].every(
      (a) => typeof a === "string" && /^(0|[1-9]\d{0,9})\.\d{2}$/.test(a),
    )
  )
    throw new Error("Invalid goal response");
  return {
    id: g.id!,
    title: g.title,
    currency: g.currency,
    savedAmount: g.savedAmount!,
    targetAmount: g.targetAmount!,
  };
};

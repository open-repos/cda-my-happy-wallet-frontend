import {
  BudgetSummary,
  toCents,
} from "@/src/features/budget/domain/budgetSummary";
import {
  MonthEndDecision,
  carryDecisionDetails,
  monthName,
  ofMonth,
} from "@/src/features/month-end/domain/monthEnd";

export interface CalculationRow {
  key: string;
  label: string;
  amountMinorUnits: number;
  /** `detail` : ligne « dont », qui ne s'ajoute pas au total. */
  kind: "line" | "detail" | "total";
}

export interface CalculationDetail {
  rows: CalculationRow[];
  /** Les lignes « dont » de la décision sont affichées. */
  decided: boolean;
  /** Le mois reporté attend encore une décision : tout est reporté. */
  pending: boolean;
}

/**
 * Détail du reste réel de l'Accueil (#420, maquette « Détail du calcul »).
 * Les montants viennent du résumé du serveur ; les lignes « dont » ne
 * s'affichent que si la décision lue explique exactement le report affiché.
 */
export const calculationDetail = (
  summary: BudgetSummary,
  decision: MonthEndDecision | null,
): CalculationDetail => {
  const carryIn = toCents(summary.carryIn);
  const sameMonth =
    decision !== null && decision.month === summary.carryFromMonth;
  const details =
    sameMonth && decision.carryMinorUnits === carryIn
      ? carryDecisionDetails(decision)
      : [];
  const rows: CalculationRow[] = [];
  if (summary.carryFromMonth !== null) {
    rows.push({
      key: "carry",
      label: `Report ${ofMonth(summary.carryFromMonth)}`,
      amountMinorUnits: carryIn,
      kind: "line",
    });
  }
  rows.push(
    ...details.map((row) => ({
      key: row.key,
      label: row.label,
      amountMinorUnits: row.amountMinorUnits,
      kind: "detail" as const,
    })),
    {
      key: "result",
      label: `Résultat de ${monthName(summary.month)}`,
      amountMinorUnits: toCents(summary.monthResult),
      kind: "line",
    },
    {
      key: "real",
      label: "Reste réel",
      amountMinorUnits: toCents(summary.realRemaining),
      kind: "total",
    },
  );
  return {
    rows,
    decided: details.length > 0,
    pending: sameMonth && decision.status === "PENDING",
  };
};

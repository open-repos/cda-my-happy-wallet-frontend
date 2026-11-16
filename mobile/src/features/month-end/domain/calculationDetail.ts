import {
  BudgetSummary,
  money,
  toCents,
} from "@/src/features/budget/domain/budgetSummary";
import {
  daysInMonth,
  theoreticalDailyShare,
} from "@/src/features/budget/domain/theoreticalRemaining";
import {
  MonthEndDecision,
  carryDecisionDetails,
  ofMonth,
} from "@/src/features/month-end/domain/monthEnd";

export interface CalculationRow {
  key: string;
  label: string;
  amountMinorUnits: number;
  /**
   * `start` : le théorique ; `line` : s'ajoute au total ; `detail` : ligne
   * « dont », qui ne s'ajoute pas ; `total` : l'actualisé.
   */
  kind: "start" | "line" | "detail" | "total";
}

export interface PerDayComparison {
  /** Actualisé du jour ; `null` sans jour restant ou sans disponible. */
  actual: { amount: string; help: string } | null;
  theoretical: { amount: string; help: string };
}

export interface CalculationDetail {
  rows: CalculationRow[];
  perDay: PerDayComparison;
  /** Les lignes « dont » de la décision sont affichées. */
  decided: boolean;
  /** Le mois reporté attend encore une décision : tout est reporté. */
  pending: boolean;
}

const dayCount = (days: number) => `${days} jour${days > 1 ? "s" : ""}`;

const line = (
  key: string,
  label: string,
  amountMinorUnits: number,
): CalculationRow => ({ key, label, amountMinorUnits, kind: "line" });

/** Lignes « dont » seulement si la décision lue explique le report affiché. */
const carryDetails = (
  summary: BudgetSummary,
  decision: MonthEndDecision | null,
) => {
  const sameMonth =
    decision !== null && decision.month === summary.carryFromMonth;
  const details =
    sameMonth && decision.carryMinorUnits === toCents(summary.carryIn)
      ? carryDecisionDetails(decision)
      : [];
  return {
    rows: details.map((row) => ({
      key: row.key,
      label: row.label,
      amountMinorUnits: row.amountMinorUnits,
      kind: "detail" as const,
    })),
    pending: sameMonth && decision.status === "PENDING",
  };
};

const perDayOf = (summary: BudgetSummary): PerDayComparison => {
  const { currency, forecast } = summary;
  const prudent = forecast?.prudentDailyAllowance ?? null;
  const daily = prudent ?? summary.realDailyAllowance;
  const spread =
    prudent === null ? summary.realRemaining : forecast!.forecastRemaining;
  return {
    actual:
      daily === null || summary.remainingDays === 0
        ? null
        : {
            amount: money(toCents(daily), currency),
            help: `${money(toCents(spread), currency)} ÷ ${dayCount(
              summary.remainingDays,
            )} restants`,
          },
    theoretical: {
      amount: money(theoreticalDailyShare(summary), currency),
      help: `${money(toCents(summary.base), currency)} ÷ ${dayCount(
        daysInMonth(summary.month),
      )}`,
    },
  };
};

/**
 * Détail du calcul de l'Accueil : du théorique à l'actualisé (#393, maquette
 * C de #391 et cascade du Web #392), en gardant les lignes « dont » du report
 * après décision (#420). Chaque montant vient du résumé du serveur.
 */
export const calculationDetail = (
  summary: BudgetSummary,
  decision: MonthEndDecision | null,
): CalculationDetail => {
  const { forecast } = summary;
  const carry = carryDetails(summary, decision);
  const rows: CalculationRow[] = [
    {
      key: "base",
      label: "Reste à vivre théorique",
      amountMinorUnits: toCents(summary.base),
      kind: "start",
    },
    line("actualIncome", "Entrées déjà reçues", toCents(summary.actualIncome)),
    line(
      "actualExpense",
      "Dépenses déjà faites",
      -toCents(summary.actualExpense),
    ),
  ];
  if (summary.reconciliationAdjustment !== undefined) {
    rows.push(
      line(
        "reconciliationAdjustment",
        "Rapprochement des enveloppes",
        toCents(summary.reconciliationAdjustment),
      ),
    );
  }
  rows.push(
    line(
      "carry",
      summary.carryFromMonth === null
        ? "Report du mois précédent"
        : `Report ${ofMonth(summary.carryFromMonth)}`,
      toCents(summary.carryIn),
    ),
    ...carry.rows,
  );
  if (forecast !== null) {
    rows.push(
      line("plannedIncome", "Entrées prévues", toCents(forecast.plannedIncome)),
      line(
        "plannedExpense",
        "Dépenses prévues",
        -toCents(forecast.plannedExpense),
      ),
      line(
        "goalSavings",
        "Épargne des objectifs",
        -toCents(forecast.goalSavings),
      ),
    );
    if (forecast.envelopeReserve !== undefined) {
      rows.push(
        line(
          "envelopeReserve",
          "Réserve des enveloppes",
          -toCents(forecast.envelopeReserve),
        ),
      );
    }
  }
  rows.push({
    key: "actualized",
    label: "Reste à vivre actualisé",
    amountMinorUnits: toCents(
      forecast?.forecastRemaining ?? summary.realRemaining,
    ),
    kind: "total",
  });
  return {
    rows,
    perDay: perDayOf(summary),
    decided: carry.rows.length > 0,
    pending: carry.pending,
  };
};

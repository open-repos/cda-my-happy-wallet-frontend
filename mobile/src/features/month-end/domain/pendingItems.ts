import {
  MonthEndDecision,
  addMonths,
  capitalize,
  isDecidableMonth,
  monthName,
  needsDecision,
  ofMonth,
} from "@/src/features/month-end/domain/monthEnd";
import {
  SavingsOccurrence,
  occurrenceTexts,
} from "@/src/features/vault/domain/savingsOccurrence";
import { formatVaultMoney } from "@/src/features/vault/domain/vault";

/**
 * Éléments « À traiter » de la cloche (#425, maquette validée) : décision en
 * attente ou à revoir, puis versements mensuels à confirmer. Calculés depuis
 * les lectures existantes : ni API dédiée, ni push, ni état « lu » (#414).
 */
export type AttentionItem =
  | { kind: "decision" | "review"; month: string; title: string; text: string }
  | {
      kind: "occurrence";
      occurrence: SavingsOccurrence;
      title: string;
      text: string;
    };

export const attentionItems = (
  decision: MonthEndDecision | null,
  occurrences: readonly SavingsOccurrence[] | null,
): AttentionItem[] => {
  const items: AttentionItem[] = [];
  if (decision !== null && needsDecision(decision)) {
    const result = decision.resultBeforeDecisionMinorUnits;
    items.push({
      kind: "decision",
      month: decision.month,
      title: `Décision ${ofMonth(decision.month)} en attente`,
      text: `${formatVaultMoney(result, decision.currency)} ${
        result < 0 ? "de déficit reporté" : "reportés"
      } pour l’instant.`,
    });
  } else if (decision?.requiresReview) {
    items.push({
      kind: "review",
      month: decision.month,
      title: `Décision ${ofMonth(decision.month)} à revoir`,
      text: `${capitalize(monthName(decision.month))} a changé après votre décision.`,
    });
  }
  for (const occurrence of occurrences ?? []) {
    items.push({
      kind: "occurrence",
      occurrence,
      title: "Versement mensuel à confirmer",
      text: occurrenceTexts(occurrence).bell,
    });
  }
  return items;
};

/** Nom accessible de la cloche, avec le nombre d'éléments. */
export const bellLabel = (count: number) =>
  count === 0
    ? "À traiter : rien pour le moment"
    : `À traiter : ${count} élément${count > 1 ? "s" : ""}`;

export interface ClosedMonthCard {
  status: "pending" | "decided" | "review";
  tag: string;
  text: string;
  rows: [string, string][];
  action: string;
}

/**
 * Décision dans le résumé d'un mois clos du calendrier. `decision` est le
 * `monthEndDecision` du résumé, absent tant que rien n'est décidé ; un mois
 * courant ou futur n'a pas de carte.
 */
export const closedMonthCard = (
  month: string,
  decision: MonthEndDecision | null,
  now: Date = new Date(),
): ClosedMonthCard | null => {
  if (!isDecidableMonth(month, now)) return null;
  if (decision === null || decision.status === "PENDING") {
    return {
      status: "pending",
      tag: "En attente",
      text: "Décision en attente · tout le solde est reporté.",
      rows: [],
      action: "Décider",
    };
  }
  const money = (value: number, signed = false) =>
    formatVaultMoney(value, decision.currency, signed);
  const carry = decision.carryMinorUnits;
  const next = monthName(addMonths(month, 1));
  const carryRow: [string, string] = [
    `${carry < 0 ? "Déficit reporté" : "Report"} sur ${next}`,
    money(carry, true),
  ];
  const result = decision.resultBeforeDecisionMinorUnits;
  const deficit = result < 0;
  const review = decision.requiresReview;
  const startRow: [string, string] = [
    `${deficit ? "Déficit" : "Disponible"} avant décision`,
    money(result),
  ];
  return {
    status: review ? "review" : "decided",
    tag: review ? "! À revoir" : "✓ Décidée",
    text: deficit
      ? `${money(decision.coverageMinorUnits)} prélevés sur l’épargne et ${money(
          decision.exceptionalIncomeMinorUnits,
        )} d’entrée exceptionnelle ; ${
          carry < 0
            ? `${money(-carry)} de déficit restent reportés.`
            : "le déficit est entièrement couvert."
        }`
      : `${money(decision.savingsMinorUnits)} épargnés ; ${money(carry)} reportés.`,
    rows: deficit
      ? [
          startRow,
          ["Prélèvements d’épargne", money(decision.coverageMinorUnits, true)],
          [
            "Entrée exceptionnelle",
            money(decision.exceptionalIncomeMinorUnits, true),
          ],
          carryRow,
        ]
      : [
          startRow,
          ["Épargne", money(-decision.savingsMinorUnits, true)],
          carryRow,
        ],
    action: review ? "Revoir la décision" : "Voir ou modifier la décision",
  };
};

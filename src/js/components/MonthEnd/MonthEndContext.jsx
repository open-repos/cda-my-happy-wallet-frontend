import React, { createContext, useContext, useMemo, useState } from "react";
import {
  useSavingsMutation,
  useSavingsPage,
  useSavingsRead,
} from "../../hooks/useSavings";
import {
  monthEndErrorMessage,
  monthEndService,
} from "../../services/monthEndService";
import { savingsService } from "../../services/savingsService";
import {
  needsDecision,
  previousParisMonth,
  shiftMonth,
} from "../../utils/monthEnd";
import { savingsMoney } from "../Savings/savingsFormat";

export const MONTH_END_CURRENCY = "EUR";
const MonthEndContext = createContext(null);
const laterKey = (month) => `mhw:month-end-later:${month}`;
const readLater = (month) => {
  try {
    return window.sessionStorage.getItem(laterKey(month)) === "1";
  } catch {
    return false;
  }
};

/**
 * Éléments à traiter calculés côté client (#396) : décision du dernier mois
 * clos et versements mensuels prévus du mois courant. Aucune notification
 * serveur n'existe ; le centre complet est suivi dans #414.
 */
export const MonthEndProvider = ({ children }) => {
  const month = useMemo(() => previousParisMonth(), []);
  const current = shiftMonth(month, 1);
  const decision = useSavingsRead(
    () => monthEndService.get(month, MONTH_END_CURRENCY),
    `month-end:${month}`,
    monthEndErrorMessage,
    { background: true }
  );
  const occurrences = useSavingsPage(
    "pendingOccurrences",
    { month: current, currency: MONTH_END_CURRENCY },
    true,
    { background: true }
  );
  const resolution = useSavingsMutation();
  const [later, setLater] = useState(() => readLater(month));
  const value = {
    month,
    current,
    decision,
    occurrences,
    resolution,
    later,
    postpone: () => {
      setLater(true);
      try {
        window.sessionStorage.setItem(laterKey(month), "1");
      } catch {
        /* Rappel limité à l'affichage courant. */
      }
    },
    resolve: (occurrence, status) =>
      resolution.run(
        () =>
          savingsService.resolveOccurrence(
            occurrence.accountId,
            occurrence.month,
            status
          ),
        status === "CONFIRMED"
          ? `Virement de ${savingsMoney(
              occurrence.amountMinorUnits,
              occurrence.currency
            )} confirmé vers ${occurrence.title}.`
          : `Versement de ${occurrence.title} non effectué ce mois-ci.`
      ),
  };
  return (
    <MonthEndContext.Provider value={value}>
      {children}
    </MonthEndContext.Provider>
  );
};

/** `null` hors de l'espace connecté (tests, pages publiques). */
export const useMonthEnd = () => useContext(MonthEndContext);

/** Données affichables, y compris pendant un rechargement de même clé. */
export const shown = (read) =>
  read.status === "error" ? null : read.data ?? null;

/** Décision du mois clos qui explique le report entrant de `summary`. */
export const useCarryDecision = (summary) => {
  const context = useMonthEnd();
  const decision = context ? shown(context.decision) : null;
  return decision &&
    decision.status === "DECIDED" &&
    decision.month === summary?.carryFromMonth
    ? decision
    : null;
};

/** Entrées de la cloche, dans l'ordre d'urgence. */
export const attentionItems = (context) => {
  if (!context) return [];
  const items = [];
  const decision = shown(context.decision);
  if (decision) {
    if (needsDecision(decision)) items.push({ type: "decide", decision });
    else if (decision.requiresReview) items.push({ type: "review", decision });
  }
  if (context.occurrences.status !== "error")
    context.occurrences.data.forEach((occurrence) =>
      items.push({ type: "occurrence", occurrence })
    );
  return items;
};

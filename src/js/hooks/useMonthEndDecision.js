import { useRef } from "react";
import { useSavingsMutation, useSavingsRead } from "./useSavings";
import {
  monthEndErrorCode,
  monthEndErrorMessage,
  monthEndService,
} from "../services/monthEndService";
import { savingsService } from "../services/savingsService";
import { newDecisionKey } from "../utils/monthEnd";

export const MAX_ACCOUNT_PAGES = 10;

/** Tous les comptes du Coffre (au plus 100 allocations par décision). */
export const loadAllSavingsAccounts = async () => {
  const accounts = [];
  const seen = new Set();
  let cursor = null;
  for (let page = 0; page < MAX_ACCOUNT_PAGES; page += 1) {
    const result = await savingsService.accounts({}, cursor);
    accounts.push(...result.data);
    cursor = result.meta.hasNext ? result.meta.nextCursor : null;
    if (!cursor) return accounts;
    if (seen.has(cursor)) throw new Error("Repeated savings cursor");
    seen.add(cursor);
  }
  return accounts;
};

/**
 * Lecture et remplacement de la décision d'un mois clos. Une tentative
 * incertaine conserve sa clé d'idempotence tant que la répartition, la
 * révision attendue et le mois sont identiques ; le serveur rejoue alors la
 * réponse d'origine au lieu de créer un doublon.
 */
export const useMonthEndDecision = (month, currency = "EUR") => {
  const decision = useSavingsRead(
    () => monthEndService.get(month, currency),
    `month-end-page:${month}:${currency}`,
    monthEndErrorMessage
  );
  const accounts = useSavingsRead(loadAllSavingsAccounts, "month-end-accounts");
  const mutation = useSavingsMutation(decision.reload, monthEndErrorMessage);
  const attempt = useRef(null);
  const save = async (plan, expectedRevision, success) => {
    const signature = JSON.stringify([month, currency, expectedRevision, plan]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, key: newDecisionKey(month) };
    const { key } = attempt.current;
    const result = await mutation.run(
      () =>
        monthEndService.save(
          month,
          { ...plan, expectedRevision, idempotencyKey: key },
          currency
        ),
      success
    );
    if (result.ok || (result.error && !result.uncertain))
      attempt.current = null;
    if (monthEndErrorCode(result.error) === "REVISION_CONFLICT")
      await decision.reload();
    return result;
  };
  return { decision, accounts, mutation, save };
};

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  DecisionAttempt,
  describeDecisionFailure,
  loadAllSavingsAccounts,
  nextDecisionAttempt,
  settleDecisionAttempt,
} from "@/src/features/month-end/domain/decisionWrite";
import {
  DecisionPlan,
  homeMonthEnd,
  previousParisMonth,
} from "@/src/features/month-end/domain/monthEnd";
import { postponedMonths } from "@/src/features/month-end/domain/postponedMonths";
import { HttpMonthEndGateway } from "@/src/features/month-end/infrastructure/HttpMonthEndGateway";
import { HttpVaultGateway } from "@/src/features/vault/infrastructure/HttpVaultGateway";
import { useVaultMutation } from "@/src/features/vault/presentation/useVaultMutation";
import { useVaultValue } from "@/src/features/vault/presentation/useVaultValue";

export const MONTH_END_CURRENCY = "EUR";

const useMonthEndGateway = () => {
  const { httpClient } = useAuth();
  return useMemo(() => new HttpMonthEndGateway(httpClient), [httpClient]);
};

/** « Plus tard » du mois : partagé par l'Accueil et l'écran « Décider ». */
export const usePostponed = (month: string) => {
  const postponed = useSyncExternalStore(
    postponedMonths.subscribe,
    () => postponedMonths.has(month),
    () => postponedMonths.has(month),
  );
  const postpone = useCallback(() => postponedMonths.add(month), [month]);
  return { postponed, postpone };
};

/**
 * Proposition de l'Accueil (#420) : décision du dernier mois clos (date
 * civile de Paris), relue à chaque retour sur l'écran. Une lecture en échec
 * n'affiche rien : sans réponse, tout le solde reste reporté.
 */
export const useHomeMonthEnd = () => {
  const gateway = useMonthEndGateway();
  // Recalculé à chaque rendu : après minuit le 1er, le retour sur l'Accueil
  // propose le mois qui vient de se clore sans redémarrer l'application.
  const month = previousParisMonth();
  const load = useCallback(
    () => gateway.get(month, MONTH_END_CURRENCY),
    [gateway, month],
  );
  const read = useVaultValue(load);
  const { postponed, postpone } = usePostponed(month);
  const decision = read.status === "success" ? read.value : null;
  return {
    month,
    decision,
    state: homeMonthEnd(decision, postponed),
    postpone,
  };
};

/**
 * Lecture et remplacement de la décision d'un mois clos, avec tous les
 * comptes du Coffre. Après l'écriture, la décision et les comptes sont relus
 * sur le serveur ; après `REVISION_CONFLICT`, la décision la plus récente.
 */
export const useMonthEndDecision = (month: string) => {
  const { httpClient } = useAuth();
  const gateway = useMonthEndGateway();
  const vault = useMemo(() => new HttpVaultGateway(httpClient), [httpClient]);
  const loadDecision = useCallback(
    () => gateway.get(month, MONTH_END_CURRENCY),
    [gateway, month],
  );
  const decision = useVaultValue(loadDecision);
  const loadAccounts = useCallback(
    () => loadAllSavingsAccounts((cursor) => vault.accounts(cursor)),
    [vault],
  );
  const accounts = useVaultValue(loadAccounts);
  const { reload: reloadDecision } = decision;
  const { reload: reloadAccounts } = accounts;
  const refresh = useCallback(
    async () =>
      (await Promise.all([reloadDecision(), reloadAccounts()])).every(Boolean),
    [reloadAccounts, reloadDecision],
  );
  const mutation = useVaultMutation(refresh, describeDecisionFailure);
  // Tentative incertaine : sa clé est reprise si la répartition ne change pas.
  const attempt = useRef<DecisionAttempt | null>(null);

  const save = async (
    plan: DecisionPlan,
    expectedRevision: number,
    success: string,
  ) => {
    const previous = attempt.current;
    const current = nextDecisionAttempt(previous, {
      month,
      currency: MONTH_END_CURRENCY,
      expectedRevision,
      plan,
    });
    attempt.current = current;
    const outcome = await mutation.run(
      () =>
        gateway.save(month, MONTH_END_CURRENCY, {
          expectedRevision,
          idempotencyKey: current.key,
          plan,
        }),
      success,
    );
    if (outcome === null) return null;
    attempt.current = settleDecisionAttempt(
      current,
      outcome,
      previous === current,
    );
    if (outcome.status === "refused" && outcome.code === "REVISION_CONFLICT") {
      await reloadDecision();
    }
    return outcome;
  };

  return { decision, accounts, mutation, save };
};

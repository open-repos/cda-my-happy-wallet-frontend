import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { loadAllPages } from "@/src/features/month-end/domain/decisionWrite";
import {
  OccurrenceStatus,
  SavingsOccurrence,
  occurrenceKey,
  resolutionMessage,
} from "@/src/features/vault/domain/savingsOccurrence";
import { vaultToday } from "@/src/features/vault/domain/vault";
import { HttpVaultGateway } from "@/src/features/vault/infrastructure/HttpVaultGateway";
import { useVaultMutation } from "@/src/features/vault/presentation/useVaultMutation";
import { useVaultValue } from "@/src/features/vault/presentation/useVaultValue";

const CURRENCY = "EUR";

/**
 * Versements mensuels prévus du mois courant (#425), relus à chaque retour
 * sur l'écran. Confirmer ou refuser relit la liste : l'élément traité
 * disparaît. Une lecture en échec n'affiche rien (`items` vide).
 */
export const useSavingsOccurrences = (
  /** Relit aussi l'écran appelant (soldes, budget disponible). */
  refreshScreen?: () => Promise<boolean>,
) => {
  const { httpClient } = useAuth();
  const gateway = useMemo(() => new HttpVaultGateway(httpClient), [httpClient]);
  const month = vaultToday().slice(0, 7);
  const load = useCallback(
    () =>
      loadAllPages(
        (cursor) => gateway.pendingOccurrences(month, CURRENCY, cursor),
        occurrenceKey,
      ),
    [gateway, month],
  );
  const read = useVaultValue(load);
  const { reload } = read;
  const refresh = useCallback(
    async () =>
      (
        await Promise.all([
          reload(),
          refreshScreen?.() ?? Promise.resolve(true),
        ])
      ).every(Boolean),
    [refreshScreen, reload],
  );
  const mutation = useVaultMutation(refresh);
  const [notice, setNotice] = useState<string | null>(null);

  const resolve = async (
    occurrence: SavingsOccurrence,
    status: OccurrenceStatus,
  ) => {
    setNotice(null);
    const outcome = await mutation.run(
      () =>
        gateway.resolveOccurrence(
          occurrence.accountId,
          occurrence.month,
          status,
        ),
      resolutionMessage(occurrence, status),
    );
    if (outcome?.status === "saved") setNotice(outcome.message);
    // Déjà traité ailleurs : la liste et l'écran relus retirent l'élément.
    if (outcome?.status === "refused") await refresh();
  };

  return {
    items: read.status === "success" ? (read.value ?? []) : [],
    failed: read.status === "error",
    busy: mutation.busy,
    failure: mutation.failure,
    notice,
    resolve,
    reload,
  };
};

export type SavingsOccurrences = ReturnType<typeof useSavingsOccurrences>;

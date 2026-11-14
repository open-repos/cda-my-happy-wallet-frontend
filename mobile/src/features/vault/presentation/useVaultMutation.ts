import { useCallback, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import {
  UNREFRESHED_MESSAGE,
  WriteOutcome,
  describeWriteFailure,
  runVaultWrite,
} from "@/src/features/vault/domain/vaultWrite";

/**
 * Écriture du Coffre (#419) : une seule à la fois, puis relecture des vues.
 * `refresh` relit l'écran courant ; les autres écrans montés (accueil,
 * listes paginées) sont relus par l'invalidation partagée.
 */
export const useVaultMutation = (refresh: () => Promise<boolean>) => {
  const { invalidate } = useSimulation();
  const writing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const run = useCallback(
    async (
      write: () => Promise<unknown>,
      success: string,
    ): Promise<(WriteOutcome & { message: string }) | null> => {
      // Double appui ignoré pendant l'écriture.
      if (writing.current) return null;
      writing.current = true;
      setBusy(true);
      setFailure(null);
      try {
        const outcome = await runVaultWrite(write, refresh);
        const message =
          outcome.status !== "saved"
            ? describeWriteFailure(outcome)
            : outcome.refreshed
              ? success
              : UNREFRESHED_MESSAGE;
        if (outcome.status === "saved") invalidate();
        else setFailure(message);
        AccessibilityInfo.announceForAccessibility(message);
        return { ...outcome, message };
      } finally {
        writing.current = false;
        setBusy(false);
      }
    },
    [invalidate, refresh],
  );

  return { busy, failure, run, clear: () => setFailure(null) };
};

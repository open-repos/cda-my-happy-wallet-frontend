import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { SavingsOverview } from "@/src/features/savings/domain/savingsCapacity";
import { SavingsCapacityGateway } from "@/src/features/savings/infrastructure/HttpSavingsCapacityGateway";

type SavingsStatus = "loading" | "success" | "error";

/**
 * Capacité d'épargne du mois `from` (#217). Le premier chargement est
 * annoncé ; une actualisation (objectifs modifiés via `refreshKey`, retour
 * sur l'écran) garde l'affichage et n'annonce que son résultat (#171).
 */
export const useSavingsCapacity = (
  gateway: SavingsCapacityGateway,
  from: string,
  refreshKey = "",
) => {
  const [status, setStatus] = useState<SavingsStatus>("loading");
  const [data, setData] = useState<SavingsOverview | null>(null);
  const latest = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(
    async (quiet: boolean) => {
      const request = ++latest.current;
      if (!quiet) setStatus("loading");
      try {
        const next = await gateway.overview(from);
        if (request !== latest.current) return;
        hasData.current = true;
        setData(next);
        setStatus("success");
      } catch {
        if (request !== latest.current) return;
        // Les erreurs restent annoncées, même pendant une actualisation.
        setStatus("error");
      }
    },
    [from, gateway],
  );

  useEffect(() => {
    void load(hasData.current);
  }, [load, refreshKey]);

  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return undefined;
      }
      void load(hasData.current);
      return undefined;
    }, [load]),
  );

  return {
    status,
    data: status === "success" ? data : null,
    retry: () => void load(false),
  };
};

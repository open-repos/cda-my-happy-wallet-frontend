import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { SavingsOverview } from "@/src/features/savings/domain/savingsCapacity";
import { SavingsCapacityGateway } from "@/src/features/savings/infrastructure/HttpSavingsCapacityGateway";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";

type SavingsStatus = "loading" | "success" | "error";

/**
 * Capacité d'épargne du mois `from` (#217). Le premier chargement est
 * annoncé ; une actualisation (objectifs modifiés via `refreshKey`, retour
 * sur l'écran) garde l'affichage et n'annonce que son résultat (#171).
 * Changer de scénario de Simulation recharge en masquant l'autre (#240).
 */
export const useSavingsCapacity = (
  gateway: SavingsCapacityGateway,
  from: string,
  refreshKey = "",
) => {
  const { scenario, revision } = useSimulation();
  const key = `${from}:${scenario}:${revision}`;
  const [status, setStatus] = useState<SavingsStatus>("loading");
  const [data, setData] = useState<{
    key: string;
    overview: SavingsOverview;
  } | null>(null);
  const latest = useRef(0);
  const loadedKey = useRef<string | null>(null);

  const load = useCallback(
    async (quiet: boolean) => {
      const request = ++latest.current;
      if (!quiet) setStatus("loading");
      try {
        const next = await gateway.overview(from, scenario);
        if (request !== latest.current) return;
        loadedKey.current = key;
        setData({ key, overview: next });
        setStatus("success");
      } catch {
        if (request !== latest.current) return;
        // Les erreurs restent annoncées, même pendant une actualisation.
        setStatus("error");
      }
    },
    [from, gateway, key, scenario],
  );

  useEffect(() => {
    void load(loadedKey.current === key);
  }, [key, load, refreshKey]);

  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return undefined;
      }
      void load(loadedKey.current === key);
      return undefined;
    }, [key, load]),
  );

  // Données d'un autre scénario : masquées jusqu'au résultat courant.
  const visible = data?.key === key ? data.overview : null;
  return {
    status: status === "success" && visible === null ? "loading" : status,
    data: status === "success" ? visible : null,
    retry: () => void load(false),
  };
};

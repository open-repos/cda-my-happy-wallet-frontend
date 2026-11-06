import { useCallback, useEffect, useRef, useState } from "react";

import { BudgetForecastGateway } from "@/src/features/forecast/infrastructure/HttpBudgetForecastGateway";
import {
  SimulationComparison,
  compareScenarios,
} from "@/src/features/simulation/domain/scenario";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import { useQuietRefresh } from "@/src/features/simulation/presentation/useQuietRefresh";

type ComparisonStatus = "idle" | "loading" | "success" | "error";

interface ComparisonResult {
  key: string;
  status: "success" | "error";
  data: SimulationComparison | null;
}

const readComparison = async (gateway: BudgetForecastGateway, from: string) => {
  const [standard, simulation] = await Promise.all([
    gateway.forecast({ from, months: 1 }),
    gateway.forecast({ from, months: 1, scenario: "simulation" }),
  ]);
  return compareScenarios(standard, simulation);
};

/**
 * Reste prévu habituel et avec la Simulation pour le mois `from` (#240),
 * lu seulement quand la Simulation est affichée. Un résultat d'un autre mois
 * ou d'une autre activation est écarté grâce à la clé de sa requête ; au
 * retour sur l'écran et après une écriture, la comparaison est relue sans
 * repasser par le chargement.
 */
export const useSimulationComparison = (
  gateway: BudgetForecastGateway,
  from: string,
) => {
  const { enabled } = useSimulation();
  const [reload, setReload] = useState(0);
  const [activation, setActivation] = useState(0);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const key = `${from}:${activation}:${reload}`;

  // Chaque activation a sa clé : l'ancien résultat ne réapparaît pas.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    if (enabled) setActivation((value) => value + 1);
  }

  useEffect(() => {
    if (!enabled) return undefined;
    let isActive = true;
    readComparison(gateway, from)
      .then((data) => {
        if (isActive) setResult({ key, status: "success", data });
      })
      .catch(() => {
        if (isActive) setResult({ key, status: "error", data: null });
      });
    return () => {
      isActive = false;
    };
  }, [enabled, from, gateway, key]);

  // Lus via des refs : l'effet de focus ne se relance qu'au retour.
  const query = useRef({ enabled, from, key });
  useEffect(() => {
    query.current = { enabled, from, key };
  }, [enabled, from, key]);
  useQuietRefresh(
    useCallback(() => {
      const current = query.current;
      if (!current.enabled) return () => {};
      let isActive = true;
      readComparison(gateway, current.from)
        .then((data) => {
          if (!isActive) return;
          setResult((previous) =>
            previous?.key === current.key
              ? { key: current.key, status: "success", data }
              : previous,
          );
        })
        // Échec silencieux : la comparaison affichée reste valable.
        .catch(() => {});
      return () => {
        isActive = false;
      };
    }, [gateway]),
  );

  const current = enabled && result?.key === key ? result : null;
  return {
    status: (enabled
      ? (current?.status ?? "loading")
      : "idle") as ComparisonStatus,
    data: current?.data ?? null,
    retry: () => setReload((value) => value + 1),
  };
};

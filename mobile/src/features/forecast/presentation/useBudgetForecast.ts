import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { BudgetForecast } from "@/src/features/forecast/domain/budgetForecast";
import { BudgetForecastGateway } from "@/src/features/forecast/infrastructure/HttpBudgetForecastGateway";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";

type ForecastStatus = "loading" | "success" | "empty" | "error";

interface ForecastResult {
  key: string;
  status: Exclude<ForecastStatus, "loading">;
  data: BudgetForecast | null;
}

/**
 * Prévision des `months` mois à partir de `from` (#214). Un résultat périmé
 * est écarté grâce à la clé de sa requête ; au retour sur l'écran, la
 * prévision est relue sans repasser par le chargement (événements ou
 * objectifs modifiés entre-temps). Le scénario de la Simulation fait partie
 * de la clé : l'autre scénario reste masqué pendant le calcul (#240).
 */
export const useBudgetForecast = (
  gateway: BudgetForecastGateway,
  from: string,
  months: number,
) => {
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const { scenario, revision } = useSimulation();
  const key = `${from}:${months}:${scenario}:${revision}:${reload}`;

  useEffect(() => {
    let isActive = true;
    gateway
      .forecast({ from, months, scenario })
      .then((data) => {
        if (!isActive) return;
        setResult({
          key,
          status: data.months.length === 0 ? "empty" : "success",
          data,
        });
      })
      .catch(() => {
        if (isActive) setResult({ key, status: "error", data: null });
      });
    return () => {
      isActive = false;
    };
  }, [from, gateway, key, months, scenario]);

  // Lus via des refs : l'effet de focus ne se relance qu'au retour sur
  // l'écran, pas à chaque changement d'horizon.
  const query = useRef({ from, months, scenario, key });
  useEffect(() => {
    query.current = { from, months, scenario, key };
  }, [from, key, months, scenario]);
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return undefined;
      }
      let isActive = true;
      const current = query.current;
      gateway
        .forecast({
          from: current.from,
          months: current.months,
          scenario: current.scenario,
        })
        .then((data) => {
          if (!isActive) return;
          setResult((previous) =>
            previous?.key === current.key
              ? {
                  key: current.key,
                  status: data.months.length === 0 ? "empty" : "success",
                  data,
                }
              : previous,
          );
        })
        // Échec silencieux : la prévision affichée reste valable.
        .catch(() => {});
      return () => {
        isActive = false;
      };
    }, [gateway]),
  );

  const current = result?.key === key ? result : null;
  return {
    status: (current?.status ?? "loading") as ForecastStatus,
    data: current?.data ?? null,
    retry: () => setReload((value) => value + 1),
  };
};

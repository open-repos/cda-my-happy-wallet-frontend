import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  BudgetSummary,
  currentParisMonth,
} from "@/src/features/budget/domain/budgetSummary";
import { BudgetSummaryGateway } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";

type LoadStatus = "loading" | "success" | "error";

/** Synthèse du mois courant, rechargée à chaque retour sur l'écran. */
export const useBudgetSummary = (gateway: BudgetSummaryGateway) => {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setSummary(await gateway.getSummary(currentParisMonth()));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [gateway]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void gateway
        .getSummary(currentParisMonth())
        .then((next) => {
          if (!isActive) return;
          setSummary(next);
          setStatus("success");
        })
        .catch(() => {
          if (isActive) setStatus("error");
        });
      return () => {
        isActive = false;
      };
    }, [gateway]),
  );

  return { retry: load, status, summary };
};

import { useCallback, useEffect, useRef, useState } from "react";
import { budgetService } from "../services/budgetService";
import { goalsService } from "../services/goalsService";
import { oneOffOperationsService } from "../services/oneOffOperationsService";
import { monthEnd } from "./useBudgetCalendar";
import { expensesByCategory, goalsProgress } from "../utils/homeBudget";
import { useSimulation } from "../components/Simulation/SimulationContext";

export const HOME_CURRENCY = "EUR";

/** Mois civil courant `YYYY-MM`, aligné sur l'horloge `Europe/Paris` du backend. */
export const currentParisMonth = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(now);

/**
 * Charge une section indépendante : son échec n'empêche pas l'affichage des
 * autres blocs de l'accueil.
 */
const useSection = (load) => {
  const [state, setState] = useState({ status: "loading", data: null });
  const latestRequest = useRef(0);

  // Seule la dernière requête lancée peut mettre à jour l'état du bloc.
  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    setState({ status: "loading", data: null, loader: load });
    try {
      const data = await load();
      if (request === latestRequest.current) {
        setState({ status: "success", data, loader: load });
      }
    } catch {
      if (request === latestRequest.current) {
        setState({ status: "error", data: null, loader: load });
      }
    }
  }, [load]);

  useEffect(() => {
    reload();
    return () => {
      latestRequest.current += 1;
    };
  }, [reload]);

  return {
    ...(state.loader === load ? state : { status: "loading", data: null }),
    reload,
  };
};

/** Synthèse du mois courant, dépenses par catégorie et progression des objectifs. */
export const useHomeBudget = (month = currentParisMonth()) => {
  const { scenario, revision } = useSimulation();
  const loadSummary = useCallback(
    () =>
      budgetService.getSummary(
        month,
        HOME_CURRENCY,
        ...(scenario === "simulation" ? [scenario] : [])
      ),
    [month, scenario, revision]
  );
  const loadExpenses = useCallback(async () => {
    const [operations, categories] = await Promise.all([
      oneOffOperationsService.listAllOperations({
        from: `${month}-01`,
        to: monthEnd(month),
        currency: HOME_CURRENCY,
      }),
      oneOffOperationsService.listAllCategories(),
    ]);
    return expensesByCategory(operations, categories, HOME_CURRENCY);
  }, [month]);
  const loadGoals = useCallback(
    async () => goalsProgress(await goalsService.listAllGoals(), HOME_CURRENCY),
    []
  );

  return {
    month,
    summary: useSection(loadSummary),
    expenses: useSection(loadExpenses),
    goals: useSection(loadGoals),
  };
};

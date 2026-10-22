import { BudgetForecast } from "@/src/features/forecast/domain/budgetForecast";

/**
 * Scénario des lectures budgétaires (#240, backend #112) : `simulation`
 * ajoute les éléments potentiels ; chaque requête le porte explicitement,
 * les lectures habituelles restent sans paramètre.
 */
export type Scenario = "standard" | "simulation";

export const withScenario = (
  params: URLSearchParams,
  scenario: Scenario = "standard",
): URLSearchParams => {
  if (scenario === "simulation") params.set("scenario", "simulation");
  return params;
};

export interface SimulationComparison {
  month: string;
  currency: string;
  standardRemaining: string;
  simulationRemaining: string;
}

/**
 * Comparaison du reste prévu habituel et avec la Simulation pour un mois.
 * Les deux lectures doivent avoir même fenêtre, devise et date de référence
 * (règle du Web) : sinon elles encadrent une modification.
 */
export const compareScenarios = (
  standard: BudgetForecast,
  simulation: BudgetForecast,
): SimulationComparison => {
  const [standardMonth] = standard.months;
  const [simulationMonth] = simulation.months;
  if (
    standardMonth == null ||
    simulationMonth == null ||
    standard.from !== simulation.from ||
    standard.currency !== simulation.currency ||
    standard.referenceDate !== simulation.referenceDate
  ) {
    throw new Error("Inconsistent simulation comparison");
  }
  return {
    month: standard.from,
    currency: standard.currency,
    standardRemaining: standardMonth.forecastRemaining,
    simulationRemaining: simulationMonth.forecastRemaining,
  };
};

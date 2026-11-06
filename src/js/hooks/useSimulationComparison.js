import { useRefreshViews } from "./useRefreshViews";
import { useCallback, useEffect, useRef, useState } from "react";
import { budgetForecastService } from "../services/budgetForecastService";
import { useSimulation } from "../components/Simulation/SimulationContext";

export const useSimulationComparison = (from) => {
  const { enabled, revision } = useSimulation();
  const key = `${from}:${enabled}:${revision}`;
  const [state, setState] = useState({
    status: "idle",
    standard: null,
    simulation: null,
    key,
  });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    if (!enabled) {
      setState({ status: "idle", standard: null, simulation: null, key });
      return true;
    }
    setState({ status: "loading", standard: null, simulation: null, key });
    try {
      const query = { from, months: 1, currency: "EUR" };
      const [standard, simulation] = await Promise.all([
        budgetForecastService.forecast({ ...query, scenario: "standard" }),
        budgetForecastService.forecast({ ...query, scenario: "simulation" }),
      ]);
      if (
        !standard.months.length ||
        !simulation.months.length ||
        standard.referenceDate !== simulation.referenceDate ||
        standard.from !== simulation.from ||
        standard.currency !== simulation.currency
      )
        throw new Error("Inconsistent simulation comparison");
      if (request === latest.current)
        setState({ status: "success", standard, simulation, key });
      return true;
    } catch {
      if (request === latest.current)
        setState({ status: "error", standard: null, simulation: null, key });
      return false;
    }
  }, [from, enabled, key]);
  useRefreshViews(reload);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  const visible = !enabled
    ? { status: "idle", standard: null, simulation: null }
    : state.key === key
    ? state
    : { status: "loading", standard: null, simulation: null };
  return { ...visible, reload };
};

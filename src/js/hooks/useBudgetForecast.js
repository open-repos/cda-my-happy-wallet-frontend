import { useCallback, useEffect, useRef, useState } from "react";
import { budgetForecastService } from "../services/budgetForecastService";
import { useSimulation } from "../components/Simulation/SimulationContext";

export const useBudgetForecast = (query, problem = null) => {
  const { scenario, revision } = useSimulation();
  const [state, setState] = useState({ status: "loading", data: null });
  const latest = useRef(0);
  const key = JSON.stringify({
    ...query,
    ...(query.scenario === undefined && scenario === "simulation"
      ? { scenario }
      : {}),
  });
  const identity = `${key}:${revision}:${problem}`;
  const reload = useCallback(async () => {
    const request = ++latest.current;
    if (problem) {
      setState({ status: "invalid", data: null, identity });
      return;
    }
    setState({ status: "loading", data: null, identity });
    try {
      const data = await budgetForecastService.forecast(JSON.parse(key));
      if (latest.current === request)
        setState({
          status: data.months.length ? "success" : "empty",
          data,
          identity,
        });
    } catch {
      if (latest.current === request)
        setState({ status: "error", data: null, identity });
    }
  }, [key, problem, identity]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  return {
    ...(state.identity === identity
      ? state
      : { status: problem ? "invalid" : "loading", data: null }),
    reload,
  };
};

import { useCallback, useEffect, useRef, useState } from "react";
import { savingsCapacityService } from "../services/savingsCapacityService";
import { useSimulation } from "../components/Simulation/SimulationContext";

export const useSavingsCapacity = (from, refreshKey = "") => {
  const { scenario, revision } = useSimulation();
  const query = JSON.stringify({
    from,
    currency: "EUR",
    ...(scenario === "simulation" ? { scenario } : {}),
  });
  const identity = `${query}:${refreshKey}:${revision}`;
  const [state, setState] = useState({ status: "loading", data: null });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: "loading", data: null, identity });
    try {
      const data = await savingsCapacityService.overview(JSON.parse(query));
      if (request === latest.current)
        setState({ status: "success", data, identity });
    } catch {
      if (request === latest.current)
        setState({ status: "error", data: null, identity });
    }
  }, [query, identity]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload, refreshKey]);
  return {
    ...(state.identity === identity
      ? state
      : { status: "loading", data: null }),
    reload,
  };
};

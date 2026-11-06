import { useEffect, useRef } from "react";
import { useSimulation } from "../components/Simulation/SimulationContext";

/** Register reads, never writes; each recovery uses the current filters and query. */
export const useRefreshViews = (reload) => {
  const simulation = useSimulation();
  const current = useRef(reload);
  current.current = reload;
  const register = simulation.registerRefresh;
  useEffect(() => {
    if (!register || !current.current) return undefined;
    let alive = true;
    const unregister = register(async () => {
      if (!alive) return true;
      const result = await current.current();
      return (
        !alive ||
        (Array.isArray(result)
          ? result.every((value) => value !== false)
          : result !== false)
      );
    });
    return () => {
      alive = false;
      unregister();
    };
  }, [register]);
  return (
    simulation.refreshViews ??
    (async () => {
      simulation.invalidate?.();
      return current.current ? current.current() : true;
    })
  );
};

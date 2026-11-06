import { useRefreshViews } from "./useRefreshViews";
import { useCallback, useEffect, useRef, useState } from "react";
import { monthlyEventsService } from "../services/monthlyEventsService";
import { useSimulation } from "../components/Simulation/SimulationContext";

export const usePotentialEvents = () => {
  const { available, revision } = useSimulation();
  const [state, setState] = useState({
    status: "loading",
    events: [],
    revision: -1,
  });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    if (!available) return true;
    const request = ++latest.current;
    setState({ status: "loading", events: [], revision });
    try {
      const events = await monthlyEventsService.listPotentialEvents();
      if (request === latest.current)
        setState({ status: "success", events, revision });
      return true;
    } catch {
      if (request === latest.current)
        setState({ status: "error", events: [], revision });
      return false;
    }
  }, [available, revision]);
  useRefreshViews(reload);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  const visible = !available
    ? { status: "idle", events: [] }
    : state.revision === revision
    ? state
    : { status: "loading", events: [] };
  return { ...visible, reload };
};

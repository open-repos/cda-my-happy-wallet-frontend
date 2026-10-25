import { useCallback, useEffect, useRef, useState } from "react";
import { useSimulation } from "../components/Simulation/SimulationContext";
import { savingsTrajectoryService } from "../services/savingsTrajectoryService";

export const useSavingsTrajectory = (goal, months, assumptions) => {
  const { scenario, revision } = useSimulation();
  const request = JSON.stringify({
    selectedGoalId: goal.id,
    currency: goal.currency,
    scenario,
    months,
    ...assumptions,
  });
  const expected = JSON.stringify(goal);
  const identity = `${request}:${expected}:${revision}`;
  const latest = useRef(0);
  const [state, setState] = useState({ status: "loading", data: null });
  const reload = useCallback(async () => {
    const sequence = ++latest.current;
    setState({ status: "loading", data: null, identity });
    try {
      const data = await savingsTrajectoryService.simulate(
        JSON.parse(request),
        JSON.parse(expected)
      );
      if (sequence === latest.current)
        setState({ status: "success", data, identity });
    } catch (error) {
      if (sequence === latest.current)
        setState({
          status: error?.code === "STALE_GOAL" ? "conflict" : "error",
          data: null,
          identity,
        });
    }
  }, [request, expected, identity]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  return {
    ...(state.identity === identity
      ? state
      : { status: "loading", data: null }),
    reload,
  };
};

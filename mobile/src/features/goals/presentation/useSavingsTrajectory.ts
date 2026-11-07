import { useCallback, useEffect, useRef, useState } from "react";

import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";
import {
  Assumptions,
  SavingsTrajectories,
  StaleGoalError,
} from "@/src/features/goals/domain/savingsTrajectory";
import { SavingsTrajectoryGateway } from "@/src/features/goals/infrastructure/HttpSavingsTrajectoryGateway";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";

export type TrajectoryStatus = "loading" | "success" | "error" | "conflict";

type Settled =
  | { identity: string; status: "success"; data: SavingsTrajectories }
  | { identity: string; status: "error" | "conflict"; data: null };

/**
 * Trajectoires de l'objectif sous les hypothèses appliquées (#285), comme le
 * Web. L'identité couvre objectif, période, hypothèses, scénario et révision
 * de la Simulation : tout changement relance la lecture, et les anciens
 * résultats sont masqués pour ne pas les attribuer aux nouvelles hypothèses.
 */
export const useSavingsTrajectory = (
  gateway: SavingsTrajectoryGateway,
  goal: FinancialGoal,
  months: number,
  assumptions: Assumptions,
) => {
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
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const sequence = ++latest.current;
    gateway.simulate(JSON.parse(request), JSON.parse(expected)).then(
      (data) => {
        if (sequence === latest.current) {
          setSettled({ identity, status: "success", data });
        }
      },
      (error: unknown) => {
        if (sequence === latest.current) {
          setSettled({
            identity,
            status: error instanceof StaleGoalError ? "conflict" : "error",
            data: null,
          });
        }
      },
    );
    return () => {
      if (sequence === latest.current) latest.current += 1;
    };
  }, [gateway, request, expected, identity, attempt]);

  const reload = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);

  const current = settled?.identity === identity ? settled : null;
  return {
    status: (current?.status ?? "loading") as TrajectoryStatus,
    data: current?.status === "success" ? current.data : null,
    reload,
  };
};

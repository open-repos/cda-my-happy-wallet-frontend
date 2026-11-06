import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { EventRequestError } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";
import { simulationErrorMessage } from "@/src/features/simulation/domain/potential";
import { Scenario } from "@/src/features/simulation/domain/scenario";

type MutationStatus = "idle" | "loading" | "success" | "error";

interface SimulationState {
  /** Interrupteur affiché par les écrans compatibles. */
  available: boolean;
  enabled: boolean;
  setEnabled(enabled: boolean): void;
  scenario: Scenario;
  /** Augmente après une écriture de la Simulation : lectures à refaire. */
  revision: number;
  invalidate(): void;
  /**
   * Écriture de la Simulation (#241) : une seule à la fois, lectures
   * invalidées après succès, refus métier expliqués. `true` si réussie.
   */
  mutate(action: () => Promise<unknown>, success: string): Promise<boolean>;
  mutationStatus: MutationStatus;
  message: string | null;
  clearMessage(): void;
}

const fallback: SimulationState = {
  available: false,
  enabled: false,
  setEnabled: () => {},
  scenario: "standard",
  revision: 0,
  invalidate: () => {},
  mutate: async () => false,
  mutationStatus: "idle",
  message: null,
  clearMessage: () => {},
};

const SimulationContext = createContext<SimulationState>(fallback);

/**
 * État de la Simulation pour la zone authentifiée (#240) : désactivée à
 * chaque entrée, jamais persistée ; seules les requêtes portent le scénario.
 */
export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabled] = useState(false);
  const [revision, setRevision] = useState(0);
  const [mutationStatus, setMutationStatus] = useState<MutationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);

  const invalidate = useCallback(
    () => setRevision((current) => current + 1),
    [],
  );
  const mutate = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      // Double appui ignoré pendant l'écriture.
      if (busy.current) return false;
      busy.current = true;
      setMutationStatus("loading");
      setMessage(null);
      try {
        await action();
        invalidate();
        setMutationStatus("success");
        setMessage(success);
        return true;
      } catch (error) {
        setMutationStatus("error");
        setMessage(
          simulationErrorMessage(
            error instanceof EventRequestError ? error.code : null,
          ),
        );
        return false;
      } finally {
        busy.current = false;
      }
    },
    [invalidate],
  );

  const value = useMemo<SimulationState>(
    () => ({
      available: true,
      enabled,
      setEnabled,
      scenario: enabled ? "simulation" : "standard",
      revision,
      invalidate,
      mutate,
      mutationStatus,
      message,
      clearMessage: () => setMessage(null),
    }),
    [enabled, invalidate, message, mutate, mutationStatus, revision],
  );
  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => useContext(SimulationContext);

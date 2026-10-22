import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { Scenario } from "@/src/features/simulation/domain/scenario";

interface SimulationState {
  /** Interrupteur affiché par les écrans compatibles. */
  available: boolean;
  enabled: boolean;
  setEnabled(enabled: boolean): void;
  scenario: Scenario;
  /** Augmente après une écriture de la Simulation (#241) : lectures à refaire. */
  revision: number;
  invalidate(): void;
}

const fallback: SimulationState = {
  available: false,
  enabled: false,
  setEnabled: () => {},
  scenario: "standard",
  revision: 0,
  invalidate: () => {},
};

const SimulationContext = createContext<SimulationState>(fallback);

/**
 * État de la Simulation pour la zone authentifiée (#240) : désactivée à
 * chaque entrée, jamais persistée ; seules les requêtes portent le scénario.
 */
export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabled] = useState(false);
  const [revision, setRevision] = useState(0);
  const value = useMemo<SimulationState>(
    () => ({
      available: true,
      enabled,
      setEnabled,
      scenario: enabled ? "simulation" : "standard",
      revision,
      invalidate: () => setRevision((current) => current + 1),
    }),
    [enabled, revision],
  );
  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => useContext(SimulationContext);

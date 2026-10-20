import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

const fallback = {
  available: false,
  enabled: false,
  scenario: "standard",
  revision: 0,
  setEnabled: () => {},
  invalidate: () => {},
  mutate: async () => false,
  mutationStatus: "idle",
  message: "",
  activeForm: null,
  setActiveForm: () => {},
};
const SimulationContext = createContext(fallback);
const errors = {
  EXPIRED_POTENTIAL:
    "Le mois de cet élément potentiel est passé. Choisissez une date du mois courant ou d’un mois futur.",
  INVALID_STATUS_TRANSITION:
    "La confirmation doit passer par l’action Confirmer de la Simulation.",
};

/** UI state only: every API request still carries its own explicit scenario. */
export const SimulationProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(false);
  const [revision, setRevision] = useState(0);
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [activeForm, setActiveForm] = useState(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const invalidate = useCallback(() => setRevision((value) => value + 1), []);
  React.useEffect(() => {
    const refresh = () => {
      if (!document.hidden) invalidate();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [invalidate]);
  const mutate = useCallback(
    async (
      action,
      success,
      failure = "La modification de la Simulation n’a pas pu être enregistrée. Réessayez."
    ) => {
      if (busy.current) return false;
      busy.current = true;
      setMutationStatus("loading");
      setMessage("");
      try {
        await action();
        if (mounted.current) {
          invalidate();
          setMutationStatus("success");
          setMessage(success);
        }
        return true;
      } catch (error) {
        if (mounted.current) {
          setMutationStatus("error");
          const code = error?.response?.data?.error?.details?.code;
          setMessage(errors[code] || failure);
        }
        return false;
      } finally {
        busy.current = false;
      }
    },
    [invalidate]
  );
  return (
    <SimulationContext.Provider
      value={{
        available: true,
        enabled,
        setEnabled,
        scenario: enabled ? "simulation" : "standard",
        revision,
        invalidate,
        mutate,
        mutationStatus,
        message,
        activeForm,
        setActiveForm,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};
export const useSimulation = () => useContext(SimulationContext);

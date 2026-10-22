import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";

/**
 * Relit sans bruit au retour sur l'écran et après une écriture de la
 * Simulation (#241) : l'affichage reste en place, rien n'est annoncé (#171).
 * `refresh` doit rester stable (dépendances lues via des refs) et rendre sa
 * fonction d'annulation ; le premier focus suit le chargement initial.
 */
export const useQuietRefresh = (refresh: () => () => void) => {
  const { revision } = useSimulation();
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return undefined;
      }
      return refresh();
    }, [refresh]),
  );
  const seenRevision = useRef(revision);
  useEffect(() => {
    if (seenRevision.current === revision) return undefined;
    seenRevision.current = revision;
    return refresh();
  }, [refresh, revision]);
};

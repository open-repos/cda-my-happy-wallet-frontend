import { useEffect, useRef, useState } from "react";

const SETTLED = new Set(["success", "future", "paging"]);

/**
 * Vrai quand le chargement de la vue `key` doit être annoncé (#171) : tant
 * qu'elle n'a encore rien affiché, ou après un échec. L'actualisation d'une
 * vue déjà affichée (après une modification, `invalidate()` ou un retour sur
 * l'onglet) n'annonce que son résultat, même si la section remontre
 * brièvement un état de chargement.
 *
 * Une clé n'est tenue pour affichée qu'après un chargement observé pour
 * elle : un statut encore « success » de la vue précédente, rendu avec la
 * nouvelle clé avant le début de sa requête, ne compte pas.
 */
export const useAnnouncesLoading = (status, key) => {
  const [settledKey, setSettledKey] = useState(null);
  const loadingKey = useRef(null);
  useEffect(() => {
    if (status === "loading") loadingKey.current = key;
    else if (SETTLED.has(status) && loadingKey.current === key)
      setSettledKey(key);
    // Après un échec, ou une section masquée (Simulation désactivée), le
    // prochain chargement est de nouveau annoncé.
    else if (status === "error" || status === "idle") setSettledKey(null);
  }, [status, key]);
  return status === "loading" && settledKey !== key;
};

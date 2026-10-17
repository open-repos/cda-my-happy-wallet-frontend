import { useCallback, useEffect, useState } from "react";
import { fetchCategoryIcons } from "./categoryIconSource";

let loadedPack = null;
let pending = null;
// Chaque composant monté reçoit le pack dès qu'un chargement réussit, même
// lancé par un autre (par exemple « Réessayer » dans le sélecteur).
const subscribers = new Set();

/**
 * Tracés des icônes autorisées, `Map<"style:nom", [largeur, hauteur, d]>`.
 * Le fichier (environ 400 ko compressé) n'est téléchargé qu'une fois, quand
 * une icône doit être affichée ou choisie. Un échec permet un nouvel essai.
 */
export const loadCategoryIconPack = () => {
  if (loadedPack) return Promise.resolve(loadedPack);
  if (!pending) {
    pending = fetchCategoryIcons()
      .then((icons) => {
        loadedPack = new Map(Object.entries(icons));
        subscribers.forEach((notify) => notify(loadedPack));
        return loadedPack;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
};

/**
 * `{ pack, failed, retry }` : `pack` vaut `null` tant qu'il n'est pas chargé.
 * `enabled` évite tout téléchargement tant qu'aucune icône n'est utile.
 */
export const useCategoryIconPack = (enabled = true) => {
  const [pack, setPack] = useState(loadedPack);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const notify = (loaded) => {
      setPack(loaded);
      setFailed(false);
    };
    subscribers.add(notify);
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  useEffect(() => {
    if (!enabled || pack) return undefined;
    let isActive = true;
    setFailed(false);
    loadCategoryIconPack()
      .then((loaded) => {
        if (isActive) setPack(loaded);
      })
      // Hors ligne : la pastille de couleur reste affichée.
      .catch(() => {
        if (isActive) setFailed(true);
      });
    return () => {
      isActive = false;
    };
  }, [enabled, pack, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { pack, failed, retry };
};

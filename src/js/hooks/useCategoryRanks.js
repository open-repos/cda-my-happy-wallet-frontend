import { useEffect, useState } from "react";
import { categoryService } from "../services/categoryService";
import { paletteRanks } from "../utils/categoryPalette";

/**
 * Rangs de palette des catégories de l'utilisateur, pour colorer les
 * analyses comme l'accueil (#172). Lus une fois par montage de la page :
 * `settled` indique que la lecture est terminée. En cas d'échec, `ranks`
 * reste `null` et les graphiques suivent l'ordre d'affichage.
 */
export const useCategoryRanks = () => {
  const [state, setState] = useState({ ranks: null, settled: false });
  useEffect(() => {
    let active = true;
    categoryService
      .listAll()
      .then((categories) => {
        if (active)
          setState({ ranks: paletteRanks(categories), settled: true });
      })
      .catch(() => {
        if (active) setState({ ranks: null, settled: true });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
};

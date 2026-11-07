import { useCallback, useEffect, useState } from "react";

import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";

export type FixedCategoriesStatus = "loading" | "success" | "error";

/**
 * Catalogue des catégories pour le budget fixe (#385). Un échec n'efface
 * aucune affectation : le formulaire garde son choix et propose de réessayer
 * le seul catalogue.
 */
export const useFixedCategories = (
  load: () => Promise<OperationCategory[]>,
) => {
  const [categories, setCategories] = useState<OperationCategory[]>([]);
  const [status, setStatus] = useState<FixedCategoriesStatus>("loading");

  useEffect(() => {
    let isActive = true;
    void load().then(
      (loaded) => {
        if (!isActive) return;
        setCategories(loaded);
        setStatus("success");
      },
      () => {
        if (isActive) setStatus("error");
      },
    );
    return () => {
      isActive = false;
    };
  }, [load]);

  const retry = useCallback(async () => {
    setStatus("loading");
    try {
      setCategories(await load());
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [load]);

  return { categories, status, retry };
};

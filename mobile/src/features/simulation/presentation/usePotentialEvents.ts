import { useCallback, useEffect, useState } from "react";

import { MonthlyEvent } from "@/src/features/events/domain/monthlyEvent";
import { PotentialEventsGateway } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";
import { useQuietRefresh } from "@/src/features/simulation/presentation/useQuietRefresh";

type PotentialsStatus = "loading" | "success" | "error";

/**
 * Éléments potentiels de la Simulation, toutes pages (#241). Seul le premier
 * chargement (ou une relance) est annoncé ; après une écriture ou au retour
 * sur l'écran, la liste est relue sans bruit et un échec garde l'affichage.
 */
export const usePotentialEvents = (gateway: PotentialEventsGateway) => {
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{
    reload: number;
    status: Exclude<PotentialsStatus, "loading">;
    events: MonthlyEvent[];
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    gateway
      .listPotentialEvents()
      .then((events) => {
        if (isActive) setResult({ reload, status: "success", events });
      })
      .catch(() => {
        if (isActive) setResult({ reload, status: "error", events: [] });
      });
    return () => {
      isActive = false;
    };
  }, [gateway, reload]);

  useQuietRefresh(
    useCallback(() => {
      let isActive = true;
      gateway
        .listPotentialEvents()
        .then((events) => {
          if (!isActive) return;
          setResult((current) =>
            current?.status === "success" ? { ...current, events } : current,
          );
        })
        .catch(() => {});
      return () => {
        isActive = false;
      };
    }, [gateway]),
  );

  const current = result?.reload === reload ? result : null;
  return {
    status: (current?.status ?? "loading") as PotentialsStatus,
    events: current?.events ?? [],
    retry: () => setReload((value) => value + 1),
  };
};

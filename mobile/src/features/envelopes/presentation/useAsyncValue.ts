import { useCallback, useEffect, useRef, useState } from "react";

import { PagedStatus } from "@/src/features/envelopes/presentation/usePagedCollection";

type Settled<T> =
  | { load: () => Promise<T>; status: "success"; value: T }
  | { load: () => Promise<T>; status: "error"; value: null };

/**
 * Valeur lue une fois, relançable. L'état « chargement » se déduit de la
 * lecture en cours ; une réponse obsolète (autre lecture, démontage) est
 * ignorée.
 */
export const useAsyncValue = <T>(load: (() => Promise<T>) | null) => {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (load === null) return undefined;
    const request = ++latest.current;
    load().then(
      (value) => {
        if (request === latest.current)
          setSettled({ load, status: "success", value });
      },
      () => {
        if (request === latest.current)
          setSettled({ load, status: "error", value: null });
      },
    );
    return () => {
      // Démontage ou nouvelle lecture : la réponse en vol devient obsolète.
      if (request === latest.current) latest.current += 1;
    };
  }, [load, attempt]);

  const current = settled?.load === load ? settled : null;
  // Sans lecture possible (paramètre absent), rien n'est en cours.
  const status: PagedStatus | "idle" =
    load === null ? "idle" : (current?.status ?? "loading");
  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);

  return { status, value: current?.value ?? null, retry };
};

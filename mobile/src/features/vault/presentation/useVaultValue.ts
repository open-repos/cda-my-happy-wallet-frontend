import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

type Load<T> = () => Promise<T>;
type Settled<T> =
  | { load: Load<T>; status: "success"; value: T }
  | { load: Load<T>; status: "error"; value: null };

/**
 * Valeur du Coffre lue sur le serveur (#419). `reload` relit sans masquer
 * l'affichage et dit si la lecture a réussi ; une relecture échouée garde la
 * valeur affichée. Une réponse obsolète (autre compte, mois ou devise,
 * démontage) est ignorée. L'écran est relu à chaque retour dessus.
 */
export const useVaultValue = <T>(load: Load<T>) => {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  const read = useCallback(
    (quiet: boolean) => {
      const request = ++latest.current;
      return load().then(
        (value) => {
          if (request === latest.current) {
            setSettled({ load, status: "success", value });
          }
          return true;
        },
        () => {
          if (request === latest.current) {
            setSettled((current) =>
              quiet && current?.load === load && current.status === "success"
                ? current
                : { load, status: "error", value: null },
            );
          }
          return false;
        },
      );
    },
    [load],
  );

  useEffect(() => {
    void read(false);
    return () => {
      latest.current += 1;
    };
  }, [read, attempt]);

  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) void read(true);
      hasFocused.current = true;
      return undefined;
    }, [read]),
  );

  const current = settled?.load === load ? settled : null;
  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);
  const reload = useCallback(() => read(true), [read]);

  return {
    status: current?.status ?? ("loading" as const),
    value: current?.value ?? null,
    retry,
    reload,
  };
};

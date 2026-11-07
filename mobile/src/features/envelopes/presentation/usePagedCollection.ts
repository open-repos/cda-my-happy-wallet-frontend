import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

import {
  PagedRows,
  appendPage,
  firstPage,
  isRepeatedCursor,
} from "@/src/features/envelopes/domain/pagination";
import { CollectionPage } from "@/src/features/operations/domain/oneOffOperation";

export type PagedStatus = "loading" | "success" | "error";

type Load<T> = (cursor: string | null) => Promise<CollectionPage<T>>;

type Settled<T> =
  | ({ load: Load<T>; status: "success" } & PagedRows<T>)
  | { load: Load<T>; status: "error" };

/**
 * Liste paginée par curseur opaque (#384). L'état « chargement » se déduit
 * de la lecture en cours. Au retour sur l'écran, la première page est relue
 * sans masquer l'affichage ; si cette relecture échoue, les lignes restent.
 * Une réponse obsolète est ignorée ; un curseur répété arrête la pagination.
 */
export const usePagedCollection = <T extends { id: number }>(
  load: Load<T>,
  loadedMessage: (count: number) => string,
) => {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [paging, setPaging] = useState(false);
  const [pagingError, setPagingError] = useState(false);
  const latest = useRef(0);

  const readFirstPage = useCallback(
    (quiet: boolean) => {
      const request = ++latest.current;
      load(null).then(
        (page) => {
          if (request !== latest.current) return;
          setPagingError(false);
          setSettled({ load, status: "success", ...firstPage(page) });
        },
        () => {
          if (request !== latest.current) return;
          setSettled((current) =>
            quiet && current?.load === load && current.status === "success"
              ? current
              : { load, status: "error" },
          );
        },
      );
      return request;
    },
    [load],
  );

  useEffect(() => {
    const request = readFirstPage(false);
    return () => {
      if (request === latest.current) latest.current += 1;
    };
  }, [readFirstPage, attempt]);

  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return undefined;
      }
      readFirstPage(true);
      return undefined;
    }, [readFirstPage]),
  );

  const current = settled?.load === load ? settled : null;
  const success = current?.status === "success" ? current : null;

  const loadMore = useCallback(async () => {
    if (success === null || success.cursor === null || paging) return;
    const request = latest.current;
    setPaging(true);
    setPagingError(false);
    try {
      if (isRepeatedCursor(success)) throw new Error("Repeated cursor");
      const page = await load(success.cursor);
      if (request !== latest.current) return;
      const next = appendPage(success, page);
      setSettled({ ...success, ...next });
      AccessibilityInfo.announceForAccessibility(
        loadedMessage(next.rows.length),
      );
    } catch {
      if (request === latest.current) setPagingError(true);
    } finally {
      setPaging(false);
    }
  }, [load, loadedMessage, paging, success]);

  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    status: (current?.status ?? "loading") as PagedStatus,
    rows: success?.rows ?? [],
    hasNext: success?.cursor != null,
    paging,
    pagingError,
    loadMore: () => void loadMore(),
    retry,
  };
};

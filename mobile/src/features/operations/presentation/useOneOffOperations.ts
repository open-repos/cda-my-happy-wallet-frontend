import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  OneOffOperation,
  OperationCategory,
  OperationDraft,
  PaginationMeta,
} from "../domain/oneOffOperation";
import {
  OperationQuery,
  emptyOperationQuery,
  operationRequestFilter,
} from "../domain/operationQuery";
import { OneOffOperationsGateway } from "../infrastructure/HttpOneOffOperationsGateway";
import { useQuietRefresh } from "@/src/features/simulation/presentation/useQuietRefresh";

type LoadStatus = "loading" | "success" | "error";
type AsyncStatus = "idle" | "loading" | "error";
const DEFAULT_QUERY = emptyOperationQuery();
const mergeUniqueOperations = (
  current: OneOffOperation[],
  incoming: OneOffOperation[],
): OneOffOperation[] => {
  const ids = new Set(current.map((row) => row.id));
  return [...current, ...incoming.filter((row) => !ids.has(row.id))];
};

export const useOneOffOperations = (
  gateway: OneOffOperationsGateway,
  query: OperationQuery = DEFAULT_QUERY,
) => {
  const filter = useMemo(() => operationRequestFilter(query), [query]);
  const queryKey = JSON.stringify(filter);
  const filterRef = useRef(filter);
  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  const generation = useRef(0);
  const loadedPages = useRef(1);
  const hasLoaded = useRef(false);
  const pageLoading = useRef(false);
  const [operations, setOperations] = useState<OneOffOperation[]>([]);
  const [categories, setCategories] = useState<OperationCategory[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [pageStatus, setPageStatus] = useState<AsyncStatus>("idle");
  const [refreshStatus, setRefreshStatus] = useState<AsyncStatus>("idle");
  const [mutationStatus, setMutationStatus] = useState<AsyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(
    async (pages = 1): Promise<boolean> => {
      const version = ++generation.current;
      const currentFilter = filterRef.current;
      await Promise.resolve();
      if (version !== generation.current) return false;
      // A cursor belongs to its query. Never reuse it while another first page loads.
      setMeta(null);
      setPageStatus("idle");
      pageLoading.current = false;
      setMessage(null);
      setRefreshStatus("loading");
      if (!hasLoaded.current) setStatus("loading");
      try {
        const [firstPage, availableCategories] = await Promise.all([
          gateway.listOperations(null, currentFilter),
          gateway.listAllCategories(),
        ]);
        let page = firstPage;
        let rows = page.data;
        let count = 1;
        const seen = new Set<string>();
        while (
          count < pages &&
          page.meta.hasNext &&
          page.meta.nextCursor != null
        ) {
          if (generation.current !== version) return false;
          if (seen.has(page.meta.nextCursor))
            throw new Error("Repeated operation cursor");
          seen.add(page.meta.nextCursor);
          page = await gateway.listOperations(
            page.meta.nextCursor,
            currentFilter,
          );
          rows = mergeUniqueOperations(rows, page.data);
          count++;
        }
        if (generation.current !== version) return false;
        loadedPages.current = count;
        hasLoaded.current = true;
        setOperations(rows);
        setCategories(availableCategories);
        setMeta(page.meta);
        setStatus("success");
        setRefreshStatus("idle");
        return true;
      } catch {
        if (generation.current !== version) return false;
        if (!hasLoaded.current) setStatus("error");
        setRefreshStatus("error");
        setMessage(
          "Les opérations n’ont pas pu être actualisées. Réessayez l’actualisation.",
        );
        return false;
      }
    },
    [gateway],
  );

  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    loadedPages.current = 1;
    void reload();
    return invalidate;
  }, [reload, queryKey, invalidate]);

  useQuietRefresh(
    useCallback(() => {
      void reload(loadedPages.current);
      return () => {
        generation.current++;
      };
    }, [reload]),
  );

  const loadMore = useCallback(async () => {
    if (
      meta?.hasNext !== true ||
      meta.nextCursor == null ||
      pageLoading.current ||
      refreshStatus !== "idle"
    )
      return;
    const version = generation.current;
    pageLoading.current = true;
    setPageStatus("loading");
    setMessage(null);
    try {
      const page = await gateway.listOperations(
        meta.nextCursor,
        filterRef.current,
      );
      if (version !== generation.current) return;
      loadedPages.current++;
      setOperations((current) => mergeUniqueOperations(current, page.data));
      setMeta(page.meta);
      setPageStatus("idle");
    } catch {
      if (version !== generation.current) return;
      setPageStatus("error");
      setMessage("La page suivante n’a pas pu être chargée.");
    } finally {
      if (version === generation.current) pageLoading.current = false;
    }
  }, [gateway, meta, refreshStatus]);

  const mutate = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setMutationStatus("loading");
      setMessage(null);
      try {
        await action();
        const reloaded = await reload();
        setMutationStatus("idle");
        setMessage(
          reloaded
            ? successMessage
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée.",
        );
        return true;
      } catch {
        setMutationStatus("error");
        setMessage("L’opération n’a pas pu être enregistrée. Réessayez.");
        return false;
      }
    },
    [reload],
  );

  return {
    operations,
    categories,
    meta,
    status,
    pageStatus,
    refreshStatus,
    mutationStatus,
    message,
    retry: () => reload(),
    loadMore,
    createOperation: (draft: OperationDraft) =>
      mutate(() => gateway.createOperation(draft), "Opération ajoutée."),
    updateOperation: (id: number, draft: OperationDraft) =>
      mutate(() => gateway.updateOperation(id, draft), "Opération modifiée."),
    deleteOperation: (id: number) =>
      mutate(() => gateway.deleteOperation(id), "Opération supprimée."),
  };
};

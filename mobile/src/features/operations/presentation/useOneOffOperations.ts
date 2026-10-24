import { useCallback, useEffect, useRef, useState } from "react";

import {
  OneOffOperation,
  OperationCategory,
  OperationDraft,
  PaginationMeta,
} from "@/src/features/operations/domain/oneOffOperation";
import { OneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

import { useQuietRefresh } from "@/src/features/simulation/presentation/useQuietRefresh";

type LoadStatus = "loading" | "success" | "error";
type AsyncStatus = "idle" | "loading" | "error";

const mergeUniqueOperations = (
  current: OneOffOperation[],
  incoming: OneOffOperation[],
): OneOffOperation[] => {
  const knownIds = new Set(current.map(({ id }) => id));
  return [...current, ...incoming.filter(({ id }) => !knownIds.has(id))];
};

export const useOneOffOperations = (gateway: OneOffOperationsGateway) => {
  const loadedPages = useRef(1);
  const [operations, setOperations] = useState<OneOffOperation[]>([]);
  const [categories, setCategories] = useState<OperationCategory[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [pageStatus, setPageStatus] = useState<AsyncStatus>("idle");
  const [mutationStatus, setMutationStatus] = useState<AsyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadInitial = useCallback(async (): Promise<boolean> => {
    setStatus("loading");
    setMessage(null);
    try {
      const [operationPage, availableCategories] = await Promise.all([
        gateway.listOperations(),
        gateway.listAllCategories(),
      ]);
      loadedPages.current = 1;
      setOperations(operationPage.data);
      setCategories(availableCategories);
      setMeta(operationPage.meta);
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      setMessage(
        "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez.",
      );
      return false;
    }
  }, [gateway]);

  useEffect(() => {
    let isActive = true;
    void Promise.all([gateway.listOperations(), gateway.listAllCategories()])
      .then(([operationPage, availableCategories]) => {
        if (!isActive) return;
        setOperations(operationPage.data);
        setCategories(availableCategories);
        setMeta(operationPage.meta);
        setStatus("success");
      })
      .catch(() => {
        if (!isActive) return;
        setStatus("error");
        setMessage(
          "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez.",
        );
      });
    return () => {
      isActive = false;
    };
  }, [gateway]);

  // Same screen and loaded pagination window survive a global quick addition.
  useQuietRefresh(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          let page = await gateway.listOperations();
          let next = page.data;
          for (
            let index = 1;
            index < loadedPages.current && page.meta.hasNext;
            index++
          ) {
            page = await gateway.listOperations(page.meta.nextCursor);
            next = mergeUniqueOperations(next, page.data);
          }
          const availableCategories = await gateway.listAllCategories();
          if (!active) return;
          setOperations(next);
          setMeta(page.meta);
          setCategories(availableCategories);
        } catch {
          if (active)
            setMessage(
              "L’ajout est enregistré, mais la liste n’a pas pu être actualisée. Revenez sur cet écran pour relire les opérations.",
            );
        }
      })();
      return () => {
        active = false;
      };
    }, [gateway]),
  );

  const loadMore = useCallback(async () => {
    if (
      meta?.hasNext !== true ||
      meta.nextCursor == null ||
      pageStatus === "loading"
    ) {
      return;
    }
    setPageStatus("loading");
    setMessage(null);
    try {
      const page = await gateway.listOperations(meta.nextCursor);
      loadedPages.current += 1;
      setOperations((current) => mergeUniqueOperations(current, page.data));
      setMeta(page.meta);
      setPageStatus("idle");
    } catch {
      setPageStatus("error");
      setMessage("La page suivante n’a pas pu être chargée.");
    }
  }, [gateway, meta, pageStatus]);

  const mutate = useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      setMutationStatus("loading");
      setMessage(null);
      try {
        await action();
        const reloaded = await loadInitial();
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
    [loadInitial],
  );

  return {
    operations,
    categories,
    meta,
    status,
    pageStatus,
    mutationStatus,
    message,
    retry: loadInitial,
    loadMore,
    createOperation: (draft: OperationDraft) =>
      mutate(() => gateway.createOperation(draft), "Opération ajoutée."),
    updateOperation: (id: number, draft: OperationDraft) =>
      mutate(() => gateway.updateOperation(id, draft), "Opération modifiée."),
    deleteOperation: (id: number) =>
      mutate(() => gateway.deleteOperation(id), "Opération supprimée."),
  };
};

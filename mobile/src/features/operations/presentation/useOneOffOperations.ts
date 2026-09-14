import { useCallback, useEffect, useState } from "react";

import {
  OneOffOperation,
  OperationCategory,
  OperationDraft,
  PaginationMeta,
} from "@/src/features/operations/domain/oneOffOperation";
import { OneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

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

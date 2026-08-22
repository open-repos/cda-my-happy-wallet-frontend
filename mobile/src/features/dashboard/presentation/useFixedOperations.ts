import { useCallback, useEffect, useState } from "react";

import {
  FixedOperation,
  FixedOperationDraft,
} from "@/src/features/dashboard/domain/fixedBudget";
import { FixedBudgetGateway } from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";
import { PaginationMeta } from "@/src/features/operations/domain/oneOffOperation";

type LoadStatus = "loading" | "success" | "error";
type AsyncStatus = "idle" | "loading" | "error";

const mergeUnique = (
  current: FixedOperation[],
  incoming: FixedOperation[],
): FixedOperation[] => {
  const knownIds = new Set(current.map(({ id }) => id));
  return [...current, ...incoming.filter(({ id }) => !knownIds.has(id))];
};

export const useFixedOperations = (gateway: FixedBudgetGateway) => {
  const [operations, setOperations] = useState<FixedOperation[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [pageStatus, setPageStatus] = useState<AsyncStatus>("idle");
  const [mutationStatus, setMutationStatus] = useState<AsyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadInitial = useCallback(async (): Promise<boolean> => {
    setStatus("loading");
    setMessage(null);
    try {
      const page = await gateway.list();
      setOperations(page.data);
      setMeta(page.meta);
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      setMessage("Votre budget fixe est momentanément indisponible.");
      return false;
    }
  }, [gateway]);

  useEffect(() => {
    let isActive = true;
    void gateway
      .list()
      .then((page) => {
        if (!isActive) return;
        setOperations(page.data);
        setMeta(page.meta);
        setStatus("success");
      })
      .catch(() => {
        if (!isActive) return;
        setStatus("error");
        setMessage("Votre budget fixe est momentanément indisponible.");
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
      const page = await gateway.list(meta.nextCursor);
      setOperations((current) => mergeUnique(current, page.data));
      setMeta(page.meta);
      setPageStatus("idle");
    } catch {
      setPageStatus("error");
      setMessage("La suite du budget fixe n’a pas pu être chargée.");
    }
  }, [gateway, meta, pageStatus]);

  const mutate = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
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
        setMessage("La modification n’a pas pu être enregistrée. Réessayez.");
        return false;
      }
    },
    [loadInitial],
  );

  return {
    operations,
    meta,
    status,
    pageStatus,
    mutationStatus,
    message,
    retry: loadInitial,
    loadMore,
    create: (draft: FixedOperationDraft) =>
      mutate(() => gateway.create(draft), "Élément ajouté au budget fixe."),
    update: (operation: FixedOperation, draft: FixedOperationDraft) =>
      mutate(
        () => gateway.update(operation, draft),
        "Élément du budget fixe modifié.",
      ),
    delete: (operation: FixedOperation) =>
      mutate(
        () => gateway.delete(operation),
        "Élément supprimé du budget fixe.",
      ),
  };
};

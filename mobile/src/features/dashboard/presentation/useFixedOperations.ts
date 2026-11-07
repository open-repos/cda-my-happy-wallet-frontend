import { useCallback, useEffect, useRef, useState } from "react";
import { FixedOperation, FixedOperationDraft } from "../domain/fixedBudget";
import { FixedBudgetGateway } from "../infrastructure/HttpFixedBudgetGateway";

type LoadStatus = "loading" | "success" | "error";
type AsyncStatus = "idle" | "loading" | "error";

/** Local sorting/filtering requires the complete collection, never just its first page. */
export const useFixedOperations = (gateway: FixedBudgetGateway) => {
  const [operations, setOperations] = useState<FixedOperation[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [mutationStatus, setMutationStatus] = useState<AsyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const generation = useRef(0);
  const loadInitial = useCallback(async (): Promise<boolean> => {
    const version = ++generation.current;
    await Promise.resolve();
    if (version !== generation.current) return false;
    setStatus("loading");
    setMessage(null);
    try {
      const rows = await gateway.listAll();
      if (version !== generation.current) return false;
      setOperations(rows);
      setStatus("success");
      return true;
    } catch {
      if (version !== generation.current) return false;
      setStatus("error");
      setMessage("Votre budget fixe est momentanément indisponible.");
      return false;
    }
  }, [gateway]);
  const invalidate = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadInitial();
    }, 0);
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [loadInitial, invalidate]);

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
    status,
    mutationStatus,
    message,
    retry: loadInitial,
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

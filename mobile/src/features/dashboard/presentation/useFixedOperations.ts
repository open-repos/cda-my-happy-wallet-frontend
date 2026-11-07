import { envelopeErrorMessage } from "@/src/features/envelopes/domain/budgetEnvelope";
import { monthLabel } from "@/src/features/envelopes/presentation/envelopeFormat";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import {
  FixedOperation,
  FixedOperationDraft,
  FIXED_CATEGORY_UNAVAILABLE_MESSAGE,
} from "../domain/fixedBudget";
import {
  FixedBudgetGateway,
  FixedBudgetRequestError,
} from "../infrastructure/HttpFixedBudgetGateway";

type LoadStatus = "loading" | "success" | "error";
type AsyncStatus = "idle" | "loading" | "error";

/** Local sorting/filtering requires the complete collection, never just its first page. */
export const useFixedOperations = (gateway: FixedBudgetGateway) => {
  const [operations, setOperations] = useState<FixedOperation[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [mutationStatus, setMutationStatus] = useState<AsyncStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
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

  // Accueil, enveloppes et calendrier relisent après une écriture (#389).
  const { invalidate: refreshViews } = useSimulation();
  const mutate = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setMutationStatus("loading");
      setMessage(null);
      setCategoryError(null);
      try {
        await action();
        refreshViews();
        const reloaded = await loadInitial();
        setMutationStatus("idle");
        setMessage(
          reloaded
            ? successMessage
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée.",
        );
        return true;
      } catch (error) {
        setMutationStatus("error");
        if (
          error instanceof FixedBudgetRequestError &&
          error.code === "INVALID_FIXED_CATEGORY"
        ) {
          setCategoryError(FIXED_CATEGORY_UNAVAILABLE_MESSAGE);
          setMessage(FIXED_CATEGORY_UNAVAILABLE_MESSAGE);
        } else {
          // Erreurs d'enveloppe et de mois d'effet : messages du Web (#389).
          setMessage(
            envelopeErrorMessage(
              error instanceof FixedBudgetRequestError ? error.code : null,
              "La modification n’a pas pu être enregistrée. Réessayez.",
            ),
          );
        }
        return false;
      }
    },
    [loadInitial, refreshViews],
  );
  return {
    operations,
    status,
    mutationStatus,
    message,
    categoryError,
    clearCategoryError: () => setCategoryError(null),
    retry: loadInitial,
    create: (draft: FixedOperationDraft) =>
      mutate(() => gateway.create(draft), "Élément ajouté au budget fixe."),
    update: (operation: FixedOperation, draft: FixedOperationDraft) =>
      mutate(
        () => gateway.update(operation, draft),
        draft.effectiveMonth
          ? `Élément du budget fixe : modification enregistrée à partir de ${monthLabel(draft.effectiveMonth)}.`
          : "Élément du budget fixe modifié.",
      ),
    delete: (operation: FixedOperation) =>
      mutate(
        () => gateway.delete(operation),
        "Élément supprimé du budget fixe.",
      ),
  };
};

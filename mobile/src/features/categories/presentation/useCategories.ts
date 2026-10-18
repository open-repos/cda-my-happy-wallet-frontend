import { useCallback, useEffect, useRef, useState } from "react";

import {
  CategoryDraft,
  CategoryErrorCode,
  categoryErrorMessage,
} from "@/src/features/categories/domain/categoryDraft";
import {
  CategoriesGateway,
  CategoryRequestError,
} from "@/src/features/categories/infrastructure/HttpCategoriesGateway";
import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";

type LoadStatus = "loading" | "success" | "error";
type MutationStatus = "idle" | "loading" | "error";

export interface CategoryResult {
  ok: boolean;
  code: CategoryErrorCode;
}

/** Liste et commandes des catégories d'opérations. */
export const useCategories = (gateway: CategoriesGateway) => {
  const [categories, setCategories] = useState<OperationCategory[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [mutationStatus, setMutationStatus] = useState<MutationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Verrou synchrone : deux appuis rapides n'envoient qu'une commande.
  const busy = useRef(false);

  /** `silent` : rechargement après une commande, sans masquer la liste. */
  const load = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!silent) {
        setStatus("loading");
        setMessage(null);
      }
      try {
        setCategories(await gateway.listAll());
        setStatus("success");
        return true;
      } catch {
        // Après une commande réussie, la liste affichée reste en place : le
        // message dit alors que l'écriture a eu lieu sans actualisation.
        if (silent) return false;
        setStatus("error");
        setMessage(
          "Impossible de charger vos catégories. Vérifiez votre connexion puis réessayez.",
        );
        return false;
      }
    },
    [gateway],
  );

  useEffect(() => {
    let isActive = true;
    gateway
      .listAll()
      .then((loaded) => {
        if (!isActive) return;
        setCategories(loaded);
        setStatus("success");
      })
      .catch(() => {
        if (!isActive) return;
        setStatus("error");
        setMessage(
          "Impossible de charger vos catégories. Vérifiez votre connexion puis réessayez.",
        );
      });
    return () => {
      isActive = false;
    };
  }, [gateway]);

  const mutate = useCallback(
    async (
      action: () => Promise<unknown>,
      successMessage: string,
    ): Promise<CategoryResult | null> => {
      if (busy.current) return null;
      busy.current = true;
      setMutationStatus("loading");
      setMessage(null);
      try {
        await action();
        const reloaded = await load(true);
        setMutationStatus("idle");
        setMessage(
          reloaded
            ? successMessage
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée.",
        );
        return { ok: true, code: null };
      } catch (error) {
        const code = error instanceof CategoryRequestError ? error.code : null;
        if (code === "CATEGORY_NOT_FOUND") await load(true);
        setMutationStatus("error");
        setMessage(categoryErrorMessage(code));
        return { ok: false, code };
      } finally {
        busy.current = false;
      }
    },
    [load],
  );

  return {
    categories,
    status,
    mutationStatus,
    message,
    retry: () => load(),
    /** Efface l'erreur d'une action précédente quand l'utilisateur change d'action. */
    clearMessage: () => {
      setMutationStatus("idle");
      setMessage(null);
    },
    save: (id: number | null, draft: CategoryDraft) =>
      id == null
        ? mutate(() => gateway.create(draft), "Catégorie ajoutée.")
        : mutate(() => gateway.update(id, draft), "Catégorie modifiée."),
    remove: (id: number) =>
      mutate(() => gateway.remove(id), "Catégorie supprimée."),
  };
};

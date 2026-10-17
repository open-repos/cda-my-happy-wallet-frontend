import { useCallback, useEffect, useState } from "react";
import {
  categoryErrorCode,
  categoryService,
} from "../services/categoryService";

const loadError =
  "Impossible de charger vos catégories. Vérifiez votre connexion puis réessayez.";

const errorMessages = {
  CATEGORY_NAME_CONFLICT:
    "Une catégorie porte déjà ce nom. Choisissez-en un autre.",
  CATEGORY_IN_USE:
    "Cette catégorie est utilisée par des opérations : modifiez-les avant de la supprimer.",
  CATEGORY_NOT_FOUND: "Cette catégorie n’existe plus. La liste est actualisée.",
  INVALID_CATEGORY_ICON:
    "Cette icône n’est plus disponible. Choisissez-en une autre ou « Sans icône ».",
};

/** Liste et commandes des catégories d'opérations. */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState("");

  /** `silent` : rechargement après une commande, sans démonter la liste. */
  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setStatus("loading");
      setMessage("");
    }
    try {
      setCategories(await categoryService.listAll());
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      setMessage(loadError);
      return false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Résout `{ ok, code }` : le formulaire place l'erreur près du champ. */
  const mutate = async (action, successMessage, failureMessage) => {
    setMutationStatus("loading");
    setMessage("");
    try {
      await action();
      const reloaded = await load(true);
      setMutationStatus("success");
      setMessage(
        reloaded
          ? successMessage
          : "La modification est enregistrée, mais la liste n’a pas pu être actualisée."
      );
      return { ok: true, code: null };
    } catch (error) {
      const code = categoryErrorCode(error);
      if (code === "CATEGORY_NOT_FOUND") await load(true);
      setMutationStatus("error");
      setMessage(errorMessages[code] ?? failureMessage);
      return { ok: false, code };
    }
  };

  return {
    categories,
    status,
    mutationStatus,
    message,
    retry: () => load(),
    saveCategory: (id, category) =>
      id === null
        ? mutate(
            () => categoryService.create(category),
            "Catégorie ajoutée.",
            "La catégorie n’a pas pu être enregistrée. Réessayez."
          )
        : mutate(
            () => categoryService.update(id, category),
            "Catégorie modifiée.",
            "La catégorie n’a pas pu être enregistrée. Réessayez."
          ),
    deleteCategory: (id) =>
      mutate(
        () => categoryService.remove(id),
        "Catégorie supprimée.",
        "La catégorie n’a pas pu être supprimée. Réessayez."
      ),
  };
};

import { useCallback, useEffect, useState } from "react";
import { oneOffOperationsService } from "../services/oneOffOperationsService";

const genericError =
  "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez.";

const mergeUniqueOperations = (current, incoming) => {
  const knownIds = new Set(current.map(({ id }) => id));
  return [...current, ...incoming.filter(({ id }) => !knownIds.has(id))];
};

export const useOneOffOperations = () => {
  const [operations, setOperations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("loading");
  const [pageStatus, setPageStatus] = useState("idle");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const loadInitial = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const [operationPage, availableCategories] = await Promise.all([
        oneOffOperationsService.listOperations(),
        oneOffOperationsService.listAllCategories(),
      ]);
      setOperations(operationPage.data);
      setCategories(availableCategories);
      setMeta(operationPage.meta);
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      setMessage(genericError);
      return false;
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (!meta?.hasNext || !meta.nextCursor || pageStatus === "loading") return;
    setPageStatus("loading");
    setMessage("");
    try {
      const page = await oneOffOperationsService.listOperations(
        meta.nextCursor
      );
      setOperations((current) => mergeUniqueOperations(current, page.data));
      setMeta(page.meta);
      setPageStatus("idle");
    } catch {
      setPageStatus("error");
      setMessage("La page suivante n’a pas pu être chargée.");
    }
  };

  const mutate = async (action, successMessage) => {
    setMutationStatus("loading");
    setMessage("");
    try {
      await action();
      const reloaded = await loadInitial();
      setMutationStatus("success");
      setMessage(
        reloaded
          ? successMessage
          : "La modification est enregistrée, mais la liste n’a pas pu être actualisée."
      );
      return true;
    } catch {
      setMutationStatus("error");
      setMessage("L’opération n’a pas pu être enregistrée. Réessayez.");
      return false;
    }
  };

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
    createOperation: (operation) =>
      mutate(
        () => oneOffOperationsService.createOperation(operation),
        "Opération ajoutée."
      ),
    updateOperation: (id, operation) =>
      mutate(
        () => oneOffOperationsService.updateOperation(id, operation),
        "Opération modifiée."
      ),
    deleteOperation: (id) =>
      mutate(
        () => oneOffOperationsService.deleteOperation(id),
        "Opération supprimée."
      ),
  };
};

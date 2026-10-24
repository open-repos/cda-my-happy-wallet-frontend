import { useCallback, useEffect, useRef, useState } from "react";
import { oneOffOperationsService as service } from "../services/oneOffOperationsService";
import { useSimulation } from "../components/Simulation/SimulationContext";
import { isAcknowledgedWrite } from "../utils/acknowledgedWrite";
const genericError =
  "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez.";
const merge = (current, incoming) => {
  const ids = new Set(current.map((r) => r.id));
  return [...current, ...incoming.filter((r) => !ids.has(r.id))];
};
export const useOneOffOperations = () => {
  const { revision, invalidate } = useSimulation();
  const [operations, setOperations] = useState([]),
    [categories, setCategories] = useState([]),
    [meta, setMeta] = useState(null),
    [status, setStatus] = useState("loading"),
    [pageStatus, setPageStatus] = useState("idle"),
    [mutationStatus, setMutationStatus] = useState("idle"),
    [message, setMessage] = useState(""),
    [refreshError, setRefreshError] = useState(false);
  const writing = useRef(false),
    paging = useRef(false),
    latest = useRef(0),
    pages = useRef(1),
    loaded = useRef(false),
    mounted = useRef(true),
    seenRevision = useRef(revision);
  const loadInitial = useCallback(async ({ quiet = false } = {}) => {
    const request = ++latest.current;
    if (!quiet) {
      setStatus("loading");
      setMessage("");
    }
    try {
      const [first, available] = await Promise.all([
        service.listOperations(),
        service.listAllCategories(),
      ]);
      let rows = first.data,
        nextMeta = first.meta;
      const seen = new Set();
      for (
        let i = 1;
        i < pages.current && nextMeta?.hasNext && nextMeta.nextCursor;
        i++
      ) {
        if (seen.has(nextMeta.nextCursor)) throw new Error("Repeated cursor");
        seen.add(nextMeta.nextCursor);
        const page = await service.listOperations(nextMeta.nextCursor);
        rows = merge(rows, page.data);
        nextMeta = page.meta;
      }
      if (!mounted.current || request !== latest.current) return false;
      setOperations(rows);
      setCategories(available);
      setMeta(nextMeta);
      setStatus("success");
      setPageStatus("idle");
      setRefreshError(false);
      loaded.current = true;
      return true;
    } catch {
      if (!mounted.current || request !== latest.current) return false;
      setRefreshError(true);
      if (!quiet || !loaded.current) {
        setStatus("error");
        setMessage(genericError);
      }
      return false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    loadInitial();
    return () => {
      mounted.current = false;
      latest.current++;
    };
  }, [loadInitial]);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    if (!writing.current) loadInitial({ quiet: true });
  }, [revision, loadInitial]);
  const loadMore = async () => {
    if (!meta?.hasNext || !meta.nextCursor || paging.current || writing.current)
      return;
    paging.current = true;
    setPageStatus("loading");
    setMessage("");
    const request = latest.current;
    try {
      const page = await service.listOperations(meta.nextCursor);
      if (!mounted.current || request !== latest.current) return;
      pages.current++;
      setOperations((current) => merge(current, page.data));
      setMeta(page.meta);
      setPageStatus("idle");
    } catch {
      if (mounted.current && request === latest.current) {
        setPageStatus("error");
        setMessage("La page suivante n’a pas pu être chargée.");
      }
    } finally {
      paging.current = false;
    }
  };
  const mutate = async (action, text) => {
    if (writing.current) return false;
    writing.current = true;
    setMutationStatus("loading");
    setMessage("");
    try {
      try {
        await action();
      } catch (error) {
        if (!isAcknowledgedWrite(error)) throw error;
      }
      invalidate();
      const ok = await loadInitial({ quiet: true });
      if (mounted.current) {
        setMutationStatus("success");
        setMessage(
          ok
            ? text
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée."
        );
      }
      return true;
    } catch {
      if (mounted.current) {
        setMutationStatus("error");
        setMessage("L’opération n’a pas pu être enregistrée. Réessayez.");
      }
      return false;
    } finally {
      writing.current = false;
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
    refreshError,
    retry: () => {
      setMessage("");
      return loadInitial({ quiet: loaded.current });
    },
    loadMore,
    createOperation: (o) =>
      mutate(() => service.createOperation(o), "Opération ajoutée."),
    updateOperation: (id, o) =>
      mutate(() => service.updateOperation(id, o), "Opération modifiée."),
    deleteOperation: (id) =>
      mutate(() => service.deleteOperation(id), "Opération supprimée."),
  };
};

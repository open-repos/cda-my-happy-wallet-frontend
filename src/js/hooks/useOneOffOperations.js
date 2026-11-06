import { useRefreshViews } from "./useRefreshViews";
import {
  mutationErrorMessage,
  acknowledgeMutation,
  useMutationFeedback,
} from "./useMutationFeedback";
import { useCallback, useEffect, useRef, useState } from "react";
import { operationApiParams, operationQueryParams } from "../utils/tableQuery";
import { oneOffOperationsService as service } from "../services/oneOffOperationsService";
import { useSimulation } from "../components/Simulation/SimulationContext";
import { envelopeErrorMessage } from "../services/envelopesService";
const genericError =
  "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez.";
const merge = (current, incoming) => {
  const ids = new Set(current.map((r) => r.id));
  return [...current, ...incoming.filter((r) => !ids.has(r.id))];
};
/**
 * `query` (`{ sort, filters }`, voir `utils/tableQuery.js`) est appliqué par
 * l'API (#165, #361). Chaque changement repart de la première page, sans
 * démonter la liste : `queryStatus` signale l'actualisation en cours.
 */
export const useOneOffOperations = (query = null) => {
  const { revision } = useSimulation();
  const queryKey = query ? operationQueryParams(query).toString() : "";
  const params = useRef({});
  params.current = query ? operationApiParams(query) : {};
  const [operations, setOperations] = useState([]),
    [categories, setCategories] = useState([]),
    [meta, setMeta] = useState(null),
    [status, setStatus] = useState("loading"),
    [pageStatus, setPageStatus] = useState("idle"),
    [mutationStatus, setMutationStatus] = useState("idle"),
    [message, setMessage] = useState(""),
    [refreshError, setRefreshError] = useState(false),
    [queryStatus, setQueryStatus] = useState("idle");
  const writing = useRef(false),
    paging = useRef(false),
    latest = useRef(0),
    pages = useRef(1),
    loaded = useRef(false),
    mounted = useRef(true),
    seenRevision = useRef(revision),
    seenQuery = useRef(queryKey),
    querying = useRef(false);
  const loadInitial = useCallback(async ({ quiet = false } = {}) => {
    const request = ++latest.current;
    if (!quiet) {
      setStatus("loading");
      setMessage("");
    }
    try {
      const [first, available] = await Promise.all([
        service.listOperations(null, params.current),
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
        const page = await service.listOperations(
          nextMeta.nextCursor,
          params.current
        );
        rows = merge(rows, page.data);
        nextMeta = page.meta;
      }
      if (!mounted.current || request !== latest.current) return null;
      setOperations(rows);
      setCategories(available);
      setMeta(nextMeta);
      setStatus("success");
      setPageStatus("idle");
      setRefreshError(false);
      setQueryStatus("idle");
      querying.current = false;
      loaded.current = true;
      return true;
    } catch {
      if (!mounted.current || request !== latest.current) return null;
      setRefreshError(true);
      if (!quiet || !loaded.current) {
        setStatus("error");
        setMessage(genericError);
      }
      return false;
    }
  }, []);
  const refreshViews = useRefreshViews(() => loadInitial({ quiet: true }));
  const feedback = useMutationFeedback(refreshViews);
  useEffect(() => {
    mounted.current = true;
    loadInitial();
    return () => {
      mounted.current = false;
      latest.current++;
    };
  }, [loadInitial]);
  useEffect(() => {
    if (seenQuery.current === queryKey) return;
    seenQuery.current = queryKey;
    // Un curseur est lié au tri et aux filtres : la liste repart du début.
    pages.current = 1;
    querying.current = true;
    setQueryStatus("loading");
    loadInitial({ quiet: true }).then((ok) => {
      // Après un échec, `meta` reste celui de l'ancienne requête : `querying`
      // reste levé jusqu'à un chargement réussi (relâché dans `loadInitial`).
      if (ok === null) return;
      if (ok || !mounted.current) return;
      // Les lignes affichées restent celles de la requête précédente.
      setQueryStatus("error");
      setMessage(
        "Le tri ou les filtres n’ont pas pu être appliqués. Réessayez l’actualisation."
      );
    });
  }, [queryKey, loadInitial]);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    if (!writing.current) loadInitial({ quiet: true });
  }, [revision, loadInitial]);
  const loadMore = async () => {
    // Pendant une nouvelle requête, `meta` décrit encore l'ancienne : son
    // curseur serait refusé avec les nouveaux paramètres.
    if (
      !meta?.hasNext ||
      !meta.nextCursor ||
      paging.current ||
      writing.current ||
      querying.current
    )
      return;
    paging.current = true;
    setPageStatus("loading");
    setMessage("");
    const request = latest.current;
    try {
      const page = await service.listOperations(
        meta.nextCursor,
        params.current
      );
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
      const acknowledged = await acknowledgeMutation(action);
      const ok = await refreshViews();
      feedback.confirm(text, { refreshed: ok, ...acknowledged });
      if (mounted.current) {
        setMutationStatus("success");
        setMessage(
          ok
            ? text
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée."
        );
      }
      return true;
    } catch (error) {
      if (mounted.current) {
        setMutationStatus("error");
        setMessage(
          mutationErrorMessage(
            error,
            envelopeErrorMessage(
              error,
              "L’opération n’a pas pu être enregistrée. Réessayez."
            )
          )
        );
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
    queryStatus,
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

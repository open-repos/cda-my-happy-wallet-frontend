import { useCallback, useEffect, useRef, useState } from "react";
import {
  savingsService,
  savingsErrorMessage,
} from "../services/savingsService";
import { useRefreshViews } from "./useRefreshViews";
import {
  acknowledgeMutation,
  useMutationFeedback,
} from "./useMutationFeedback";
import { useSimulation } from "../components/Simulation/SimulationContext";

/** A request generation prevents old filters or pages replacing a fresh read. */
export const useSavingsPage = (resource, params, enabled = true) => {
  const key = JSON.stringify(params);
  const { revision } = useSimulation();
  const generation = useRef(0),
    paging = useRef(false),
    seen = useRef(new Set());
  const [state, setState] = useState({
    status: "loading",
    data: [],
    meta: null,
    message: "",
    paging: false,
  });
  const reload = useCallback(async () => {
    const request = ++generation.current;
    paging.current = false;
    seen.current.clear();
    setState((previous) => ({
      key,
      status: enabled ? "loading" : "idle",
      data: previous.key === key && enabled ? previous.data : [],
      meta: null,
      message: "",
      paging: false,
    }));
    if (!enabled) return true;
    try {
      const result = await savingsService[resource](JSON.parse(key));
      if (request === generation.current)
        setState({
          key,
          ...result,
          status: "success",
          paging: false,
          message: "",
        });
      return true;
    } catch (error) {
      if (request === generation.current)
        setState({
          key,
          status: "error",
          data: [],
          meta: null,
          paging: false,
          message: savingsErrorMessage(error),
        });
      return false;
    }
  }, [key, resource, enabled, revision]);
  useRefreshViews(reload);
  useEffect(() => {
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const loadMore = async () => {
    if (
      paging.current ||
      state.key !== key ||
      state.status !== "success" ||
      !state.meta?.hasNext
    )
      return;
    const cursor = state.meta.nextCursor;
    if (seen.current.has(cursor)) {
      setState((s) => ({
        ...s,
        message: "Pagination interrompue. Actualisez la liste.",
      }));
      return;
    }
    paging.current = true;
    const request = generation.current;
    setState((s) => ({ ...s, paging: true, message: "" }));
    try {
      const result = await savingsService[resource](JSON.parse(key), cursor);
      if (request !== generation.current) return;
      seen.current.add(cursor);
      const identity = (row) => `${row.source || ""}:${row.id}`;
      setState((s) => ({
        ...s,
        data: [
          ...new Map(
            [...s.data, ...result.data].map((row) => [identity(row), row])
          ).values(),
        ],
        meta: result.meta,
        paging: false,
        message: "",
      }));
    } catch (error) {
      if (request === generation.current)
        setState((s) => ({
          ...s,
          paging: false,
          message: savingsErrorMessage(error),
        }));
    } finally {
      if (request === generation.current) paging.current = false;
    }
  };
  return {
    ...(state.key === key
      ? state
      : {
          status: enabled ? "loading" : "idle",
          data: [],
          meta: null,
          paging: false,
          message: "",
        }),
    reload,
    loadMore,
    loadingKey: `${resource}:${key}`,
  };
};

/** Single resources use the same stale-response and refresh registry rules. */
export const useSavingsRead = (read, key) => {
  const latestRead = useRef(read);
  latestRead.current = read;
  const { revision } = useSimulation();
  const generation = useRef(0);
  const [state, setState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setState((previous) => ({
      key,
      status: "loading",
      data: previous.key === key ? previous.data : null,
      message: "",
    }));
    try {
      const data = await latestRead.current();
      if (request === generation.current)
        setState({ key, status: "success", data, message: "" });
      return true;
    } catch (error) {
      if (request === generation.current)
        setState({
          key,
          status: "error",
          data: null,
          message: savingsErrorMessage(error),
        });
      return false;
    }
  }, [key, revision]);
  useRefreshViews(reload);
  useEffect(() => {
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return {
    ...(state.key === key
      ? state
      : { status: "loading", data: null, message: "" }),
    reload,
  };
};

export const useSavingsMutation = (reload) => {
  const refreshViews = useRefreshViews(reload);
  const feedback = useMutationFeedback(refreshViews);
  const writing = useRef(false);
  const [state, setState] = useState({
    busy: false,
    message: "",
    error: false,
  });
  const run = async (write, success) => {
    if (writing.current) return { ok: false };
    writing.current = true;
    setState({ busy: true, message: "", error: false });
    try {
      const acknowledged = await acknowledgeMutation(write);
      // Refresh is a read-only phase. Its failure never escapes into write recovery.
      let refreshed = false;
      try {
        refreshed = (await refreshViews()) !== false;
      } catch {
        /* retained receipt */
      }
      feedback.confirm(success, { refreshed, ...acknowledged });
      setState({
        busy: false,
        error: false,
        message: refreshed
          ? success
          : "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé. Réessayez uniquement la lecture.",
      });
      return { ok: true };
    } catch (error) {
      const uncertain = !error?.response || error.response.status >= 500;
      setState({
        busy: false,
        error: true,
        message: uncertain
          ? "Le résultat de l’enregistrement est incertain. Vérifiez les données avant de réessayer. Pour un virement, reprenez la même tentative afin d’éviter un doublon."
          : savingsErrorMessage(
              error,
              "L’enregistrement a échoué. Vérifiez les valeurs puis réessayez."
            ),
      });
      return { ok: false, uncertain };
    } finally {
      writing.current = false;
    }
  };
  return {
    ...state,
    run,
    clear: () => setState({ busy: false, message: "", error: false }),
  };
};

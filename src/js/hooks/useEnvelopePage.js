import { useCallback, useEffect, useRef, useState } from "react";
import {
  envelopesService,
  envelopeErrorMessage,
} from "../services/envelopesService";
import { useSimulation } from "../components/Simulation/SimulationContext";

/** Cursor and results always belong to the same filters; stale requests cannot replace them. */
export const useEnvelopePage = (resource, params, enabled = true) => {
  const { revision } = useSimulation();
  const key = JSON.stringify(params);
  const [state, setState] = useState({
    status: "loading",
    data: [],
    meta: null,
    message: "",
    paging: false,
  });
  const latest = useRef(0),
    busy = useRef(false),
    seen = useRef(new Set());
  const reload = useCallback(async () => {
    const request = ++latest.current;
    busy.current = false;
    seen.current.clear();
    if (!enabled) {
      setState({
        status: "idle",
        data: [],
        meta: null,
        message: "",
        paging: false,
        key,
      });
      return;
    }
    setState((s) => ({
      ...s,
      status: "loading",
      message: "",
      paging: false,
      key,
    }));
    try {
      const result = await envelopesService[resource](JSON.parse(key));
      if (request === latest.current)
        setState({
          status: "success",
          ...result,
          message: "",
          paging: false,
          key,
        });
    } catch (e) {
      if (request === latest.current)
        setState({
          status: "error",
          data: [],
          meta: null,
          message: envelopeErrorMessage(e),
          paging: false,
          key,
        });
    }
  }, [resource, key, enabled, revision]);
  useEffect(() => {
    reload();
    return () => {
      latest.current++;
    };
  }, [reload]);
  const loadMore = async () => {
    if (
      busy.current ||
      !state.meta?.hasNext ||
      state.key !== key ||
      state.status !== "success"
    )
      return;
    const cursor = state.meta.nextCursor;
    if (seen.current.has(cursor)) {
      setState((s) => ({
        ...s,
        message: "Pagination interrompue : actualisez la liste.",
      }));
      return;
    }
    busy.current = true;
    const request = latest.current;
    setState((s) => ({ ...s, paging: true, message: "" }));
    try {
      const page = await envelopesService[resource](JSON.parse(key), cursor);
      if (request === latest.current) {
        seen.current.add(cursor);
        setState((s) => ({
          ...s,
          data: [
            ...s.data,
            ...page.data.filter((r) => !s.data.some((old) => old.id === r.id)),
          ],
          meta: page.meta,
          paging: false,
        }));
      }
    } catch (e) {
      if (request === latest.current)
        setState((s) => ({
          ...s,
          paging: false,
          message: envelopeErrorMessage(e),
        }));
    } finally {
      if (request === latest.current) busy.current = false;
    }
  };
  return {
    ...(state.key === key
      ? state
      : {
          status: enabled ? "loading" : "idle",
          data: [],
          meta: null,
          message: "",
          paging: false,
        }),
    reload,
    loadMore,
    loadingKey: `${resource}:${key}`,
  };
};

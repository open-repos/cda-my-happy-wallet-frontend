import { useRefreshViews } from "./useRefreshViews";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyticsErrorCode,
  analyticsService,
} from "../services/analyticsService";

/**
 * Charge l'agrégat d'une requête. Une requête refusée localement (`problem`)
 * n'appelle pas l'API; seule la dernière requête lancée met à jour l'état.
 */
export const useAnalytics = (query, problem) => {
  const [state, setState] = useState({ status: "loading", data: null });
  const latest = useRef(0);
  const key = JSON.stringify(query);

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (problem) {
      setState({ status: "invalid", data: null, message: problem });
      return true;
    }
    setState({ status: "loading", data: null });
    try {
      const data = await analyticsService.operations(JSON.parse(key));
      if (request !== latest.current) return;
      setState({
        status: data.buckets.every((bucket) => bucket.count === 0)
          ? "empty"
          : "success",
        data,
      });
      return true;
    } catch (error) {
      if (request !== latest.current) return;
      setState({
        status: "error",
        data: null,
        code: analyticsErrorCode(error),
      });
      return false;
    }
  }, [key, problem]);

  useRefreshViews(load);
  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
};

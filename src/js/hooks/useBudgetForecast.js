import { useCallback, useEffect, useRef, useState } from "react";
import { budgetForecastService } from "../services/budgetForecastService";

export const useBudgetForecast = (query, problem = null) => {
  const [state, setState] = useState({ status: "loading", data: null });
  const latest = useRef(0);
  const key = JSON.stringify(query);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    if (problem) {
      setState({ status: "invalid", data: null });
      return;
    }
    setState({ status: "loading", data: null });
    try {
      const data = await budgetForecastService.forecast(JSON.parse(key));
      if (latest.current === request)
        setState({ status: data.months.length ? "success" : "empty", data });
    } catch {
      if (latest.current === request) setState({ status: "error", data: null });
    }
  }, [key, problem]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  return { ...state, reload };
};

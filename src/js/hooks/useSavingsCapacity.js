import { useCallback, useEffect, useRef, useState } from "react";
import { savingsCapacityService } from "../services/savingsCapacityService";

export const useSavingsCapacity = (from, refreshKey = "") => {
  const [state, setState] = useState({ status: "loading", data: null });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: "loading", data: null });
    try {
      const data = await savingsCapacityService.overview({
        from,
        currency: "EUR",
      });
      if (request === latest.current) setState({ status: "success", data });
    } catch {
      if (request === latest.current) setState({ status: "error", data: null });
    }
  }, [from]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload, refreshKey]);
  return { ...state, reload };
};

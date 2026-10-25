import { useCallback, useEffect, useState } from "react";
import { CalendarElement } from "../domain/calendarContent";
import { CalendarContentGateway } from "../infrastructure/HttpCalendarContentGateway";
import { useQuietRefresh } from "@/src/features/simulation/presentation/useQuietRefresh";
export const useCalendarContent = (
  gateway: CalendarContentGateway,
  month: string,
) => {
  const [version, setVersion] = useState(0),
    [result, setResult] = useState<{
      key: string;
      items: CalendarElement[];
      status: "success" | "error";
    } | null>(null);
  const key = `${month}:${version}`;
  useEffect(() => {
    let active = true;
    gateway
      .listMonth(month)
      .then((items) => {
        if (active) setResult({ key, items, status: "success" });
      })
      .catch(() => {
        if (active) setResult({ key, items: [], status: "error" });
      });
    return () => {
      active = false;
    };
  }, [gateway, month, key]);
  const retry = useCallback(() => setVersion((v) => v + 1), []);
  useQuietRefresh(
    useCallback(() => {
      retry();
      return () => {};
    }, [retry]),
  );
  return {
    items: result?.key === key ? result.items : [],
    status: result?.key === key ? result.status : ("loading" as const),
    retry,
  };
};

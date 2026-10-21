import { useEffect, useState } from "react";

import {
  Analytics,
  AnalyticsQuery,
} from "@/src/features/analytics/domain/analytics";
import {
  AnalyticsErrorCode,
  AnalyticsGateway,
  AnalyticsRequestError,
} from "@/src/features/analytics/infrastructure/HttpAnalyticsGateway";

type AnalyticsStatus = "loading" | "invalid" | "error" | "empty" | "success";

interface AnalyticsResult {
  key: string;
  status: Exclude<AnalyticsStatus, "loading" | "invalid">;
  data: Analytics | null;
  code: AnalyticsErrorCode | null;
}

/**
 * Agrégat d'une requête (#215). Une période refusée localement (`problem`)
 * n'appelle pas l'API ; seul le résultat de la dernière requête s'affiche.
 */
export const useAnalytics = (
  gateway: AnalyticsGateway,
  query: AnalyticsQuery,
  problem: string | null,
) => {
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const queryKey = JSON.stringify(query);
  const key = `${queryKey}:${reload}`;

  useEffect(() => {
    if (problem != null) return;
    let isActive = true;
    gateway
      .operations(JSON.parse(queryKey) as AnalyticsQuery)
      .then((data) => {
        if (!isActive) return;
        setResult({
          key,
          status: data.buckets.every((bucket) => bucket.count === 0)
            ? "empty"
            : "success",
          data,
          code: null,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setResult({
          key,
          status: "error",
          data: null,
          code: error instanceof AnalyticsRequestError ? error.code : null,
        });
      });
    return () => {
      isActive = false;
    };
  }, [gateway, key, problem, queryKey]);

  const current = result?.key === key ? result : null;
  const status: AnalyticsStatus =
    problem != null ? "invalid" : (current?.status ?? "loading");
  return {
    status,
    data: current?.data ?? null,
    code: current?.code ?? null,
    retry: () => setReload((value) => value + 1),
  };
};

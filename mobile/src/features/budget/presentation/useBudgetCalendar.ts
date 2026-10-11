import { useCallback, useEffect, useMemo, useState } from "react";

import { monthBounds } from "@/src/features/budget/domain/budgetCalendar";
import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import { BudgetMonthGateway } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
import {
  OneOffOperation,
  OperationCategory,
} from "@/src/features/operations/domain/oneOffOperation";
import { OneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

type SummaryStatus = "loading" | "success" | "future" | "error";
type OperationsStatus = "loading" | "success" | "paging" | "error";

interface SummaryResult {
  key: string;
  status: Exclude<SummaryStatus, "loading">;
  summary: BudgetSummary | null;
}

interface OperationsResult {
  key: string;
  status: "success" | "error";
  items: OneOffOperation[];
  nextCursor: string | null;
}

/**
 * Données du calendrier mobile : synthèse du mois (avec ses points
 * journaliers), catégories et opérations du mois ou du jour sélectionné.
 * Chaque résultat garde la clé de sa requête : un résultat périmé n'est
 * jamais affiché et le chargement est déduit d'une clé qui ne correspond pas.
 */
export const useBudgetCalendar = (
  budget: BudgetMonthGateway,
  operations: OneOffOperationsGateway,
  month: string,
  selectedDate: string | null,
) => {
  const [reload, setReload] = useState(0);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(
    null,
  );
  const [operationsResult, setOperationsResult] =
    useState<OperationsResult | null>(null);
  const [paging, setPaging] = useState(false);
  const [pagingErrorKey, setPagingErrorKey] = useState<string | null>(null);
  const [categories, setCategories] = useState<OperationCategory[]>([]);

  const summaryKey = `${month}:${reload}`;
  const operationsKey = `${month}:${selectedDate ?? "month"}:${reload}`;
  const filter = useMemo(() => {
    const bounds = monthBounds(month);
    return {
      from: selectedDate ?? bounds.from,
      to: selectedDate ?? bounds.to,
      currency: "EUR",
    };
  }, [month, selectedDate]);

  useEffect(() => {
    let isActive = true;
    budget
      .getMonth(month)
      .then((summary) => {
        if (!isActive) return;
        setSummaryResult({
          key: summaryKey,
          status: summary === null ? "future" : "success",
          summary,
        });
      })
      .catch(() => {
        if (isActive) {
          setSummaryResult({ key: summaryKey, status: "error", summary: null });
        }
      });
    return () => {
      isActive = false;
    };
  }, [budget, month, summaryKey]);

  useEffect(() => {
    let isActive = true;
    operations
      .listOperations(null, filter)
      .then((page) => {
        if (!isActive) return;
        setOperationsResult({
          key: operationsKey,
          status: "success",
          items: page.data,
          nextCursor: page.meta.hasNext ? page.meta.nextCursor : null,
        });
      })
      .catch(() => {
        if (isActive) {
          setOperationsResult({
            key: operationsKey,
            status: "error",
            items: [],
            nextCursor: null,
          });
        }
      });
    return () => {
      isActive = false;
    };
  }, [filter, operations, operationsKey]);

  useEffect(() => {
    let isActive = true;
    operations
      .listAllCategories()
      .then((next) => {
        if (isActive) setCategories(next);
      })
      .catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, [operations]);

  const current =
    operationsResult?.key === operationsKey ? operationsResult : null;
  const nextCursor = current?.nextCursor ?? null;

  const loadMore = useCallback(async () => {
    if (current === null || nextCursor === null || paging) return;
    setPaging(true);
    setPagingErrorKey(null);
    try {
      const page = await operations.listOperations(nextCursor, filter);
      setOperationsResult((result) =>
        result?.key === operationsKey
          ? {
              ...result,
              items: [...result.items, ...page.data],
              nextCursor: page.meta.hasNext ? page.meta.nextCursor : null,
            }
          : result,
      );
    } catch {
      // Le bouton reste disponible : la page suivante peut être redemandée.
      setPagingErrorKey(operationsKey);
    } finally {
      setPaging(false);
    }
  }, [current, filter, nextCursor, operations, operationsKey, paging]);

  const summaryCurrent =
    summaryResult?.key === summaryKey ? summaryResult : null;
  const operationsStatus: OperationsStatus =
    current === null ? "loading" : paging ? "paging" : current.status;

  return {
    summary: summaryCurrent?.summary ?? null,
    summaryStatus: (summaryCurrent?.status ?? "loading") as SummaryStatus,
    categories,
    operations: current?.items ?? [],
    operationsStatus,
    hasMore: nextCursor !== null,
    pagingError: pagingErrorKey === operationsKey,
    loadMore,
    retry: () => setReload((value) => value + 1),
  };
};

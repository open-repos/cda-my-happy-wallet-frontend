import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { monthBounds } from "@/src/features/budget/domain/budgetCalendar";
import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import {
  DecisionResult,
  PendingOccurrence,
  RealizeBody,
  decisionErrorMessage,
} from "@/src/features/budget/domain/pendingOccurrence";
import { BudgetMonthGateway } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
import {
  OccurrenceRequestError,
  OccurrencesGateway,
} from "@/src/features/budget/infrastructure/HttpOccurrencesGateway";
import {
  OneOffOperation,
  OperationCategory,
} from "@/src/features/operations/domain/oneOffOperation";
import { OneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

type SummaryStatus = "loading" | "success" | "future" | "error";
type OperationsStatus = "loading" | "success" | "paging" | "error";
type FeedbackTone = "success" | "error";

interface SummaryResult {
  key: string;
  status: Exclude<SummaryStatus, "loading">;
  summary: BudgetSummary | null;
  pending: PendingOccurrence[];
  /** La file est facultative : son échec n'empêche pas d'afficher le mois. */
  pendingError: boolean;
}

interface OperationsResult {
  key: string;
  status: "success" | "error";
  items: OneOffOperation[];
  nextCursor: string | null;
}

export interface DecisionFeedback {
  tone: FeedbackTone;
  text: string;
}

/**
 * Données du calendrier mobile : synthèse du mois (avec ses points
 * journaliers), file des événements à traiter, catégories et opérations du
 * mois ou du jour sélectionné, avec les commandes `realize` et `cancel`.
 * Un résultat périmé est écarté grâce à la clé de sa requête.
 */
export const useBudgetCalendar = (
  budget: BudgetMonthGateway,
  occurrences: OccurrencesGateway,
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
  const [categoriesError, setCategoriesError] = useState(false);
  const [decision, setDecision] = useState(false);
  const [feedback, setFeedback] = useState<DecisionFeedback | null>(null);

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
    const through = monthBounds(month).to;
    // Synthèse et file rechargées ensemble après une décision; une file
    // indisponible ne masque jamais la synthèse et la grille du mois.
    Promise.all([
      budget.getMonth(month),
      occurrences
        .listPending(through)
        .then((pending) => ({ pending, pendingError: false }))
        .catch(() => ({ pending: [], pendingError: true })),
    ])
      .then(([summary, queue]) => {
        if (!isActive) return;
        setSummaryResult({
          key: summaryKey,
          status: summary === null ? "future" : "success",
          summary,
          ...queue,
        });
      })
      .catch(() => {
        if (!isActive) return;
        setSummaryResult({
          key: summaryKey,
          status: "error",
          summary: null,
          pending: [],
          pendingError: false,
        });
      });
    return () => {
      isActive = false;
    };
  }, [budget, month, occurrences, summaryKey]);

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
        if (!isActive) return;
        setCategories(next);
        setCategoriesError(false);
      })
      .catch(() => {
        if (isActive) setCategoriesError(true);
      });
    return () => {
      isActive = false;
    };
    // `reload` : « Réessayer » relance aussi les catégories après un échec.
  }, [operations, reload]);

  // Retour sur l'onglet : catégories relues sans bruit (modifiées depuis
  // l'écran des catégories). Le premier focus suit le chargement initial.
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return undefined;
      }
      let isActive = true;
      operations
        .listAllCategories()
        .then((next) => {
          if (isActive) setCategories(next);
        })
        .catch(() => {});
      return () => {
        isActive = false;
      };
    }, [operations]),
  );

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

  const retry = useCallback(() => setReload((value) => value + 1), []);

  // Verrou synchrone : deux appuis rapides ne doivent envoyer qu'une décision.
  const deciding = useRef(false);
  const decide = useCallback(
    async (
      action: () => Promise<void>,
      successText: string,
    ): Promise<DecisionResult | null> => {
      // `null` : appui ignoré pendant qu'une décision est déjà en cours.
      if (deciding.current) return null;
      deciding.current = true;
      setDecision(true);
      setFeedback(null);
      try {
        await action();
        setFeedback({ tone: "success", text: successText });
        setReload((value) => value + 1);
        return { ok: true, code: null };
      } catch (error) {
        const code =
          error instanceof OccurrenceRequestError ? error.code : null;
        if (code === "OCCURRENCE_ALREADY_RESOLVED") {
          setReload((value) => value + 1);
        }
        setFeedback({ tone: "error", text: decisionErrorMessage(code) });
        return { ok: false, code };
      } finally {
        deciding.current = false;
        setDecision(false);
      }
    },
    [],
  );

  const realize = useCallback(
    (occurrence: PendingOccurrence, body: RealizeBody) =>
      decide(
        () =>
          occurrences.realize(
            occurrence.eventId,
            occurrence.occurrenceDate,
            body,
          ),
        "Événement converti en opération.",
      ),
    [decide, occurrences],
  );

  const cancel = useCallback(
    (occurrence: PendingOccurrence) =>
      decide(
        () => occurrences.cancel(occurrence.eventId, occurrence.occurrenceDate),
        "Événement annulé.",
      ),
    [decide, occurrences],
  );

  const summaryCurrent =
    summaryResult?.key === summaryKey ? summaryResult : null;
  const operationsStatus: OperationsStatus =
    current === null ? "loading" : paging ? "paging" : current.status;

  return {
    summary: summaryCurrent?.summary ?? null,
    summaryStatus: (summaryCurrent?.status ?? "loading") as SummaryStatus,
    pending: summaryCurrent?.pending ?? [],
    pendingError: summaryCurrent?.pendingError ?? false,
    categories,
    categoriesError,
    operations: current?.items ?? [],
    operationsStatus,
    hasMore: nextCursor !== null,
    pagingError: pagingErrorKey === operationsKey,
    loadMore,
    retry,
    decision,
    feedback,
    realize,
    cancel,
  };
};

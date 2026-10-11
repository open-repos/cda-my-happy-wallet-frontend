import { useCallback, useEffect, useState } from "react";
import { budgetErrorCode, budgetService } from "../services/budgetService";
import { oneOffOperationsService } from "../services/oneOffOperationsService";

const CURRENCY = "EUR";

export const monthEnd = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
};

const operationFilter = (month, selectedDate) => ({
  from: selectedDate ?? `${month}-01`,
  to: selectedDate ?? monthEnd(month),
  currency: CURRENCY,
});

const mutationErrors = {
  PERIOD_CLOSED:
    "Ce mois est clôturé : choisissez une date du mois en cours pour enregistrer l’opération.",
  OCCURRENCE_ALREADY_RESOLVED:
    "Cet événement a déjà été traité. L’affichage a été actualisé.",
};

/**
 * Données du calendrier budgétaire d'un mois : synthèse bornée, file à
 * traiter, opérations du mois ou du jour sélectionné et commandes associées.
 */
export const useBudgetCalendar = (month, selectedDate) => {
  const [summary, setSummary] = useState(null);
  const [summaryStatus, setSummaryStatus] = useState("loading");
  const [pending, setPending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [operations, setOperations] = useState([]);
  const [operationsMeta, setOperationsMeta] = useState(null);
  const [operationsStatus, setOperationsStatus] = useState("loading");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState({ tone: "info", text: "" });

  const loadMonth = useCallback(async () => {
    setSummaryStatus("loading");
    try {
      const [nextSummary, nextPending, nextCategories] = await Promise.all([
        budgetService.getSummary(month, CURRENCY).catch((error) => {
          if (budgetErrorCode(error) === "FUTURE_PERIOD") return null;
          throw error;
        }),
        budgetService.listPending(monthEnd(month)),
        oneOffOperationsService.listAllCategories(),
      ]);
      setSummary(nextSummary);
      setPending(nextPending);
      setCategories(nextCategories);
      setSummaryStatus(nextSummary === null ? "future" : "success");
      return true;
    } catch {
      setSummaryStatus("error");
      return false;
    }
  }, [month]);

  const loadOperations = useCallback(async () => {
    setOperationsStatus("loading");
    try {
      const page = await oneOffOperationsService.listOperations(
        null,
        operationFilter(month, selectedDate)
      );
      setOperations(page.data);
      setOperationsMeta(page.meta);
      setOperationsStatus("success");
      return true;
    } catch {
      setOperationsStatus("error");
      return false;
    }
  }, [month, selectedDate]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);
  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const loadMoreOperations = async () => {
    if (!operationsMeta?.hasNext || operationsStatus === "paging") return;
    setOperationsStatus("paging");
    try {
      const page = await oneOffOperationsService.listOperations(
        operationsMeta.nextCursor,
        operationFilter(month, selectedDate)
      );
      setOperations((current) => [...current, ...page.data]);
      setOperationsMeta(page.meta);
      setOperationsStatus("success");
    } catch {
      setOperationsStatus("success");
      setMessage({
        tone: "error",
        text: "La suite des opérations n’a pas pu être chargée.",
      });
    }
  };

  const mutate = async (action, successText) => {
    setMutationStatus("loading");
    setMessage({ tone: "info", text: "" });
    try {
      await action();
      // Une écriture dans un mois passé recalcule les reports : tout recharger.
      const [monthLoaded, operationsLoaded] = await Promise.all([
        loadMonth(),
        loadOperations(),
      ]);
      setMutationStatus("success");
      setMessage({
        tone: "success",
        text:
          monthLoaded && operationsLoaded
            ? successText
            : "C’est enregistré, mais l’affichage n’a pas pu être actualisé.",
      });
      return true;
    } catch (error) {
      const code = budgetErrorCode(error);
      if (code === "OCCURRENCE_ALREADY_RESOLVED") await loadMonth();
      setMutationStatus("error");
      setMessage({
        tone: "error",
        text:
          mutationErrors[code] ??
          "L’enregistrement a échoué. Vérifiez votre connexion puis réessayez.",
      });
      return false;
    }
  };

  return {
    summary,
    summaryStatus,
    pending,
    categories,
    operations,
    operationsMeta,
    operationsStatus,
    mutationStatus,
    message,
    retry: () => Promise.all([loadMonth(), loadOperations()]),
    loadMoreOperations,
    createOperation: (operation) =>
      mutate(
        () => oneOffOperationsService.createOperation(operation),
        "Opération ajoutée."
      ),
    realizeOccurrence: (occurrence, body) =>
      mutate(
        () =>
          budgetService.realizeOccurrence(
            occurrence.eventId,
            occurrence.occurrenceDate,
            body
          ),
        "Événement converti en opération."
      ),
    cancelOccurrence: (occurrence) =>
      mutate(
        () =>
          budgetService.cancelOccurrence(
            occurrence.eventId,
            occurrence.occurrenceDate
          ),
        "Événement annulé."
      ),
  };
};

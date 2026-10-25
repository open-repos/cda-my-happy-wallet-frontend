import { isAcknowledgedWrite } from "../utils/acknowledgedWrite";
import { useCallback, useEffect, useRef, useState } from "react";
import { budgetErrorCode, budgetService } from "../services/budgetService";
import { oneOffOperationsService } from "../services/oneOffOperationsService";
import { useSimulation } from "../components/Simulation/SimulationContext";

import { monthlyEventsService } from "../services/monthlyEventsService";
import { listCalendarResolutions } from "../services/calendarResolutionsService";
import { calendarContent } from "../utils/calendarContent";
import { forecastToday } from "../utils/budgetForecast";

const CURRENCY = "EUR";

export const monthEnd = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
};

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
  const { scenario, revision, invalidate } = useSimulation();
  const queryKey = `${month}:${scenario}:${revision}`;
  const activeKey = useRef(queryKey);
  activeKey.current = queryKey;
  const [summaryKey, setSummaryKey] = useState(null);
  const latestSummary = useRef(0);
  const [summary, setSummary] = useState(null);
  const [summaryStatus, setSummaryStatus] = useState("loading");
  const [pending, setPending] = useState([]);
  const [categories, setCategories] = useState([]);
  const [operations, setOperations] = useState([]);
  const [content, setContent] = useState([]);
  const [contentKey, setContentKey] = useState(null);
  const latestOperations = useRef(0);
  const [operationsMeta, setOperationsMeta] = useState(null);
  const [operationsStatus, setOperationsStatus] = useState("loading");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState({ tone: "info", text: "" });

  const loadMonth = useCallback(async () => {
    if (activeKey.current !== queryKey) return false;
    const request = ++latestSummary.current;
    setSummaryKey(queryKey);
    setSummaryStatus("loading");
    setSummary(null);
    try {
      const [nextSummary, nextPending, nextCategories] = await Promise.all([
        budgetService
          .getSummary(
            month,
            CURRENCY,
            ...(scenario === "simulation" ? [scenario] : [])
          )
          .catch((error) => {
            if (budgetErrorCode(error) === "FUTURE_PERIOD") return null;
            throw error;
          }),
        budgetService.listPending(monthEnd(month)),
        oneOffOperationsService.listAllCategories(),
      ]);
      if (request !== latestSummary.current || activeKey.current !== queryKey)
        return false;
      setSummary(nextSummary);
      setPending(nextPending);
      setCategories(nextCategories);
      setSummaryStatus(nextSummary === null ? "future" : "success");
      return true;
    } catch {
      if (request !== latestSummary.current || activeKey.current !== queryKey)
        return false;
      setSummaryStatus("error");
      return false;
    }
  }, [month, scenario, queryKey]);

  const loadOperations = useCallback(async () => {
    if (activeKey.current !== queryKey) return false;
    const request = ++latestOperations.current;
    setContentKey(queryKey);
    setOperationsStatus("loading");
    setContent([]);
    setOperations([]);
    try {
      const [nextOperations, occurrences, resolutions] = await Promise.all([
        oneOffOperationsService.listAllOperations({
          from: `${month}-01`,
          to: monthEnd(month),
        }),
        monthlyEventsService.listOccurrences(month, "simulation"),
        listCalendarResolutions(`${month}-01`, monthEnd(month)),
      ]);
      if (
        request !== latestOperations.current ||
        activeKey.current !== queryKey
      )
        return false;
      setOperations(nextOperations);
      setContent(
        calendarContent({
          operations: nextOperations,
          occurrences,
          resolutions,
          today: forecastToday(),
        })
      );
      setOperationsMeta({ hasNext: false, nextCursor: null });
      setOperationsStatus("success");
      return true;
    } catch {
      if (
        request !== latestOperations.current ||
        activeKey.current !== queryKey
      )
        return false;
      setOperationsStatus("error");
      return false;
    }
  }, [month, queryKey]);

  useEffect(() => {
    loadMonth();
    return () => {
      latestSummary.current += 1;
    };
  }, [loadMonth, revision]);
  useEffect(() => {
    loadOperations();
    return () => {
      latestOperations.current += 1;
    };
  }, [loadOperations, revision]);

  const mutate = async (action, successText) => {
    setMutationStatus("loading");
    setMessage({ tone: "info", text: "" });
    try {
      try {
        await action();
      } catch (error) {
        if (!isAcknowledgedWrite(error)) throw error;
      }
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
      invalidate();
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
    summary: summaryKey === queryKey ? summary : null,
    summaryStatus: summaryKey === queryKey ? summaryStatus : "loading",
    pending,
    categories,
    operations: contentKey === queryKey ? operations : [],
    content: contentKey === queryKey ? content : [],
    operationsMeta,
    operationsStatus: contentKey === queryKey ? operationsStatus : "loading",
    mutationStatus,
    message,
    retry: () => Promise.all([loadMonth(), loadOperations()]),
    loadMoreOperations: () => {},
    updateOperation: (id, operation) =>
      mutate(
        () => oneOffOperationsService.updateOperation(id, operation),
        "Opération modifiée."
      ),
    deleteOperation: (id) =>
      mutate(
        () => oneOffOperationsService.deleteOperation(id),
        "Opération supprimée."
      ),
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

import { useCallback, useEffect, useState } from "react";
import { monthlyEventsService } from "../services/monthlyEventsService";

const loadError =
  "Impossible de charger vos événements. Vérifiez votre connexion puis réessayez.";

export const useMonthlyEvents = (month) => {
  const [events, setEvents] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [status, setStatus] = useState("loading");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const [nextEvents, nextOccurrences] = await Promise.all([
        monthlyEventsService.listEvents(),
        monthlyEventsService.listOccurrences(month),
      ]);
      setEvents(nextEvents);
      setOccurrences(nextOccurrences);
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      setMessage(loadError);
      return false;
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (action, successMessage) => {
    setMutationStatus("loading");
    setMessage("");
    try {
      await action();
      const reloaded = await load();
      setMutationStatus("success");
      setMessage(
        reloaded
          ? successMessage
          : "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé."
      );
      return true;
    } catch {
      setMutationStatus("error");
      setMessage("L’événement n’a pas pu être enregistré. Réessayez.");
      return false;
    }
  };

  return {
    events,
    occurrences,
    status,
    mutationStatus,
    message,
    retry: load,
    createEvent: (event) =>
      mutate(
        () => monthlyEventsService.createEvent(event),
        "Événement ajouté."
      ),
    updateEvent: (id, event) =>
      mutate(
        () => monthlyEventsService.updateEvent(id, event),
        "Événement modifié."
      ),
    deleteEvent: (id) =>
      mutate(() => monthlyEventsService.deleteEvent(id), "Événement supprimé."),
  };
};

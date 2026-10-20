import { useCallback, useEffect, useRef, useState } from "react";
import { monthlyEventsService } from "../services/monthlyEventsService";
import { useSimulation } from "../components/Simulation/SimulationContext";

const loadError =
  "Impossible de charger vos événements. Vérifiez votre connexion puis réessayez.";

export const useMonthlyEvents = (month) => {
  const { scenario, revision, invalidate } = useSimulation();
  const queryKey = `${month}:${scenario}:${revision}`;
  const activeKey = useRef(queryKey);
  activeKey.current = queryKey;
  const [loadedKey, setLoadedKey] = useState(null);
  const latest = useRef(0);
  const [events, setEvents] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [status, setStatus] = useState("loading");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (activeKey.current !== queryKey) return false;
    const request = ++latest.current;
    setLoadedKey(queryKey);
    setStatus("loading");
    try {
      const [nextEvents, nextOccurrences] = await Promise.all([
        monthlyEventsService.listEvents(),
        monthlyEventsService.listOccurrences(
          month,
          ...(scenario === "simulation" ? [scenario] : [])
        ),
      ]);
      if (request !== latest.current || activeKey.current !== queryKey)
        return false;
      setEvents(nextEvents);
      setOccurrences(nextOccurrences);
      setStatus("success");
      return true;
    } catch {
      if (request !== latest.current || activeKey.current !== queryKey)
        return false;
      setStatus("error");
      setMessage(loadError);
      return false;
    }
  }, [month, scenario, queryKey]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load, revision]);

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
      invalidate();
      return true;
    } catch {
      setMutationStatus("error");
      setMessage("L’événement n’a pas pu être enregistré. Réessayez.");
      return false;
    }
  };

  return {
    events: loadedKey === queryKey && status === "success" ? events : [],
    occurrences:
      loadedKey === queryKey && status === "success" ? occurrences : [],
    status: loadedKey === queryKey ? status : "loading",
    mutationStatus,
    message,
    retry: () => {
      setMessage("");
      return load();
    },
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

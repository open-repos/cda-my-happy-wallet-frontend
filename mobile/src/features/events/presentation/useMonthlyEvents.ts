import { useCallback, useEffect, useState } from "react";

import {
  EventDraft,
  MonthlyEvent,
} from "@/src/features/events/domain/monthlyEvent";
import { MonthlyEventsGateway } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";

type LoadStatus = "loading" | "success" | "error";
type MutationStatus = "idle" | "loading" | "error";

const LOAD_ERROR =
  "Impossible de charger vos événements. Vérifiez votre connexion puis réessayez.";

/** Événements mensuels confirmés et leurs commandes d'écriture (#225). */
export const useMonthlyEvents = (gateway: MonthlyEventsGateway) => {
  const [events, setEvents] = useState<MonthlyEvent[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [mutationStatus, setMutationStatus] = useState<MutationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // `quiet` : relecture après une écriture, sans repasser par l'état de
  // chargement (la liste et le formulaire restent affichés).
  const load = useCallback(
    async ({ quiet = false } = {}): Promise<boolean> => {
      if (!quiet) setStatus("loading");
      try {
        setEvents(await gateway.listAllEvents());
        setStatus("success");
        return true;
      } catch {
        if (!quiet) setStatus("error");
        return false;
      }
    },
    [gateway],
  );

  useEffect(() => {
    let isActive = true;
    gateway
      .listAllEvents()
      .then((next) => {
        if (!isActive) return;
        setEvents(next);
        setStatus("success");
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });
    return () => {
      isActive = false;
    };
  }, [gateway]);

  const mutate = useCallback(
    async (
      action: () => Promise<unknown>,
      successMessage: string,
      failureMessage = "L’événement n’a pas pu être enregistré. Réessayez.",
    ) => {
      setMutationStatus("loading");
      setMessage(null);
      try {
        await action();
        const reloaded = await load({ quiet: true });
        setMutationStatus("idle");
        setMessage(
          reloaded
            ? successMessage
            : "La modification est enregistrée, mais la liste n’a pas pu être actualisée.",
        );
        return true;
      } catch {
        setMutationStatus("error");
        setMessage(failureMessage);
        return false;
      }
    },
    [load],
  );

  return {
    events,
    status,
    mutationStatus,
    message,
    loadError: LOAD_ERROR,
    retry: () => load(),
    clearMessage: () => setMessage(null),
    createEvent: (draft: EventDraft) =>
      mutate(() => gateway.createEvent(draft), "Événement ajouté."),
    updateEvent: (id: number, draft: EventDraft) =>
      mutate(() => gateway.updateEvent(id, draft), "Événement modifié."),
    deleteEvent: (id: number) =>
      mutate(
        () => gateway.deleteEvent(id),
        "Événement supprimé.",
        "L’événement n’a pas pu être supprimé. Réessayez.",
      ),
  };
};

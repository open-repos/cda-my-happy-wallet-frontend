import { MutationMessage } from "../Notifications/MutationMessage";
import { ConfirmDialog } from "../Forms/ConfirmDialog";
import { ActionButton } from "../Actions/ActionButton";
import React, { useRef, useState } from "react";
import { useSimulation } from "./SimulationContext";
import { SimulationReadout } from "./SimulationControls";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import { usePotentialEvents } from "../../hooks/usePotentialEvents";
import { useFormFocus } from "../../hooks/useFormFocus";
import { monthlyEventsService } from "../../services/monthlyEventsService";
import { MonthlyEventForm } from "../MonthlyEvents/MonthlyEventForm";
import { LiveMessage } from "../LiveMessage";
import { formatMoney, longDate } from "../BudgetCalendar/budgetFormat";
import { potentialExpiration } from "../../utils/budgetSimulation";
import { forecastToday } from "../../utils/budgetForecast";
const Confirmation = ({
  title,
  label,
  disabled,
  error,
  onConfirm,
  onCancel,
}) => {
  const cancel = useRef(null);
  useFormFocus(cancel);
  return (
    <ConfirmDialog
      label={title}
      busy={disabled}
      error={error}
      onCancel={onCancel}
    >
      <section
        className="simulation-confirmation"
        role="group"
        aria-label={title}
      >
        <p>{title}</p>
        <ActionButton
          action="cancel"
          type="button"
          ref={cancel}
          className="monthly-event-button monthly-event-button--secondary"
          disabled={disabled}
          onClick={onCancel}
          aria-label="Annuler la confirmation"
        >
          Annuler
        </ActionButton>
        <button
          type="button"
          className="monthly-event-button"
          disabled={disabled}
          onClick={onConfirm}
        >
          {label}
        </button>
      </section>
    </ConfirmDialog>
  );
};
export const SimulationPanel = ({
  month,
  disabled = false,
  readout = true,
}) => {
  const state = useSimulation();
  const potentials = usePotentialEvents();
  // Une actualisation après modification n'annonce que son résultat (#171).
  const announcesPotentials = useAnnouncesLoading(
    potentials.status,
    "potentials"
  );
  const [pending, setPending] = useState(null);
  const [edited, setEdited] = useState(null);
  const busy = disabled || state.mutationStatus === "loading";
  if (!state.available) return null;
  const openConfirmation = (action, event, trigger) => {
    trigger.focus();
    setEdited(null);
    state.setActiveForm("simulation-confirmation");
    setPending({
      action,
      event,
    });
  };
  const confirm = async () => {
    const { action, event } = pending;
    const success = await state.mutate(
      () =>
        action === "confirm"
          ? monthlyEventsService.confirmPotentialEvent(event.id)
          : action === "delete"
          ? monthlyEventsService.deleteEvent(event.id)
          : monthlyEventsService.clearPotentialEvents(),
      action === "confirm"
        ? "Élément confirmé : il fait maintenant partie des prévisions habituelles."
        : action === "delete"
        ? "Élément potentiel supprimé."
        : "Simulation vidée."
    );
    if (success) {
      setPending(null);
      state.setActiveForm(null);
    }
  };
  const closeEdit = () => {
    setEdited(null);
    state.setActiveForm(null);
  };
  return (
    <section
      className="simulation-surface"
      aria-labelledby="simulation-panel-title"
    >
      <h2 id="simulation-panel-title">Simulation</h2>
      {readout && <SimulationReadout month={month} />}
      <MutationMessage
        success={state.mutationStatus === "success"}
        message={state.message}
        isError={state.mutationStatus === "error"}
      />
      <LiveMessage
        message={
          announcesPotentials
            ? "Chargement des éléments potentiels…"
            : potentials.status === "error"
            ? "Les éléments potentiels n’ont pas pu être chargés."
            : ""
        }
        isError={potentials.status === "error"}
        visible={false}
      />
      {potentials.status === "loading" && (
        <p aria-hidden="true">Chargement des éléments potentiels…</p>
      )}
      {potentials.status === "error" && (
        <>
          <p aria-hidden="true">
            Les éléments potentiels n’ont pas pu être chargés.
          </p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={potentials.reload}
          >
            Réessayer les éléments potentiels
          </button>
        </>
      )}
      {potentials.status === "success" && (
        <>
          {potentials.events.length === 0 ? (
            <p>Votre simulation est vide.</p>
          ) : (
            <>
              <button
                type="button"
                className="monthly-event-button monthly-event-button--secondary"
                disabled={busy}
                onClick={(event) =>
                  openConfirmation("clear", null, event.currentTarget)
                }
              >
                Vider la simulation
              </button>
              <ul className="simulation-list" aria-label="Éléments potentiels">
                {potentials.events.map((event) => (
                  <li key={event.id} className="simulation-potential">
                    <h3>{event.title}</h3>
                    <span className="simulation-badge">Potentiel</span>
                    <p>
                      {event.kind === "DEPENSE" ? "Dépense" : "Entrée"} :{" "}
                      {formatMoney(event.amount, event.currency)}
                    </p>
                    <p>Date de début : {longDate(event.startDate)}</p>
                    <p>
                      Expiration : à partir du{" "}
                      {longDate(potentialExpiration(event.startDate))}, si non
                      confirmé. Toute série récurrente expire selon son premier
                      mois.
                    </p>
                    <div className="planning-actions">
                      <ActionButton
                        action="confirm"
                        type="button"
                        className="monthly-event-button"
                        disabled={busy}
                        aria-label={`Confirmer ${event.title}`}
                        onClick={(click) =>
                          openConfirmation(
                            "confirm",
                            event,
                            click.currentTarget
                          )
                        }
                      >
                        Confirmer
                      </ActionButton>
                      <ActionButton
                        action="edit"
                        type="button"
                        className="monthly-event-button monthly-event-button--secondary"
                        disabled={busy}
                        aria-label={`Modifier ${event.title}`}
                        onClick={(click) => {
                          click.currentTarget.focus();
                          setEdited(event);
                          state.setActiveForm("simulation");
                        }}
                      >
                        Modifier
                      </ActionButton>
                      <ActionButton
                        action="delete"
                        type="button"
                        className="monthly-event-button monthly-event-button--secondary"
                        disabled={busy}
                        aria-label={`Supprimer ${event.title}`}
                        onClick={(click) =>
                          openConfirmation("delete", event, click.currentTarget)
                        }
                      >
                        Supprimer
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {pending && state.activeForm === "simulation-confirmation" && (
        <Confirmation
          title={
            pending.action === "confirm"
              ? `Confirmer ${pending.event.title} comme événement prévu ?`
              : pending.action === "delete"
              ? `Supprimer définitivement ${pending.event.title} ?`
              : "Supprimer définitivement tous les éléments potentiels ?"
          }
          label={
            pending.action === "confirm"
              ? "Oui, confirmer"
              : pending.action === "delete"
              ? "Oui, supprimer"
              : "Oui, vider la simulation"
          }
          disabled={busy}
          error={state.mutationStatus === "error" ? state.message : ""}
          onCancel={() => {
            setPending(null);
            state.setActiveForm(null);
          }}
          onConfirm={confirm}
        />
      )}
      {edited && state.activeForm === "simulation" && (
        <MonthlyEventForm
          key={edited.id}
          event={edited}
          formTitle="Modifier l’élément potentiel"
          minStartDate={`${forecastToday().slice(0, 7)}-01`}
          isSaving={busy}
          onCancel={closeEdit}
          onSave={async (body) => {
            if (
              await state.mutate(
                () => monthlyEventsService.updateEvent(edited.id, body),
                "Élément potentiel modifié."
              )
            )
              closeEdit();
          }}
          onDelete={async () => {
            if (
              await state.mutate(
                () => monthlyEventsService.deleteEvent(edited.id),
                "Élément potentiel supprimé."
              )
            )
              closeEdit();
          }}
        />
      )}
    </section>
  );
};

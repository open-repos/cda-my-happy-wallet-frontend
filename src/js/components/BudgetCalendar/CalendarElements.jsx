import React, { useRef, useState } from "react";
import { OneOffOperationList } from "../OneOffOperations/OneOffOperationList";
import { PendingOccurrences } from "./PendingOccurrences";
import { formatMoney, longDate } from "./budgetFormat";
import { LiveMessage } from "../LiveMessage";
import { monthlyEventsService } from "../../services/monthlyEventsService";
import { useSimulation } from "../Simulation/SimulationContext";

/** Reuses the operation inline editor and occurrence commands; owns no persistence. */
export const CalendarElements = ({ items, budget, disabled, onRealize }) => {
  const [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  const cancel = useRef(null),
    returnTo = useRef(null);
  const simulation = useSimulation();
  const restore = () =>
    requestAnimationFrame(() =>
      (returnTo.current?.isConnected
        ? returnTo.current
        : document.querySelector('.budget-day[aria-pressed="true"]') ??
          document.querySelector(".budget-calendar__quick-add button")
      )?.focus()
    );
  React.useEffect(() => {
    if (deleting) cancel.current?.focus();
  }, [deleting]);
  const real = items.filter((i) => i.operation && i.nature === "real");
  return (
    <>
      {deleting && (
        <fieldset className="monthly-event-delete-confirmation">
          <legend>Supprimer « {deleting.title} » ?</legend>
          <button
            type="button"
            ref={cancel}
            onClick={() => {
              setDeleting(null);
              restore();
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              if (await budget.deleteOperation(deleting.id)) {
                setDeleting(null);
                restore();
              }
            }}
          >
            Oui, supprimer
          </button>
        </fieldset>
      )}
      {real.length > 0 && (
        <>
          <p className="budget-help">Opérations réelles · réalisées</p>
          <OneOffOperationList
            categories={budget.categories}
            operations={real.map((i) => i.operation)}
            editingId={editing?.id}
            onEdit={(o, e) => {
              returnTo.current = e.currentTarget;
              setEditing(o);
            }}
            onDelete={(o, e) => {
              returnTo.current = e.currentTarget;
              setDeleting(o);
            }}
            onSave={async (body) => {
              if (await budget.updateOperation(editing.id, body)) {
                setEditing(null);
                restore();
              }
            }}
            onCancel={() => {
              setEditing(null);
              restore();
            }}
            busy={disabled}
            mutationError={
              budget.mutationStatus === "error" ? budget.message.text : null
            }
          />
        </>
      )}
      {real
        .filter((i) => i.resolution)
        .map((i) => (
          <p key={i.key} className="budget-help">
            {i.title} : issue de l’occurrence du{" "}
            {longDate(i.resolution.occurrenceDate)}.
          </p>
        ))}
      {items.some((i) => i.nature === "planned") && (
        <PendingOccurrences
          occurrences={items
            .filter((i) => i.nature === "planned")
            .map((i) => i.occurrence)}
          disabled={disabled}
          onRealize={onRealize}
          onCancel={budget.cancelOccurrence}
        />
      )}
      <ul className="budget-occurrence-list">
        {items
          .filter((i) => ["potential", "decision"].includes(i.nature))
          .map((item) => (
            <li key={item.key} className="budget-occurrence">
              <div className="budget-occurrence__main">
                <strong>{item.title}</strong>
                <span>{longDate(item.date)}</span>
                <span>
                  {item.kind === "ENTREE" ? "Entrée" : "Dépense"} ·{" "}
                  {formatMoney(item.amount, item.currency)}
                </span>
                <span>{item.statusLabel}</span>
                {item.resolution?.operation && (
                  <span>
                    Opération liée : {item.resolution.operation.title}
                  </span>
                )}
              </div>
              {item.nature === "potential" && (
                <button
                  type="button"
                  className="monthly-event-button"
                  disabled={disabled}
                  onClick={() =>
                    simulation.mutate(
                      () => monthlyEventsService.confirmPotentialEvent(item.id),
                      "Événement confirmé, toujours prévu."
                    )
                  }
                >
                  Confirmer {item.title}
                </button>
              )}
            </li>
          ))}
      </ul>
      <LiveMessage
        message={
          simulation.mutationStatus === "error" ? simulation.message : ""
        }
        isError
      />
    </>
  );
};

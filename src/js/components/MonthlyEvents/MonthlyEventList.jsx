import { ActionButton } from "../Actions/ActionButton";
import React from "react";
import editIcon from "../../../assets/icons/edit.svg";
import {
  eventRecurrenceLabel,
  isRepeatingEvent,
} from "../../utils/eventRecurrences";

export const formatEventAmount = (amount, currency) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    Number(amount)
  );
export const formatEventDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00.000Z`)
  );

export const MonthlyEventList = ({ events, onEdit }) => (
  <div className="monthly-event-card-grid">
    {events.map((event) => (
      <article className="monthly-event-card" key={event.id}>
        <div className="monthly-event-card__topline">
          <span
            className={`monthly-event-kind monthly-event-kind--${event.kind.toLowerCase()}`}
          >
            {event.kind === "ENTREE" ? "Entrée prévue" : "Dépense prévue"}
          </span>
          <ActionButton
            action="edit"
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={() => onEdit(event)}
            aria-label={`Modifier ${event.title}`}
          >
            Modifier
          </ActionButton>
        </div>
        <h3>{event.title}</h3>
        <strong>{formatEventAmount(event.amount, event.currency)}</strong>
        <p>À partir du {formatEventDate(event.startDate)}</p>
        <p>
          {eventRecurrenceLabel(event.recurrence)}
          {isRepeatingEvent(event.recurrence) && event.endDate
            ? ` jusqu’au ${formatEventDate(event.endDate)}`
            : ""}
        </p>
      </article>
    ))}
  </div>
);

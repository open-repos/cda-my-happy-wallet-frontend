import React from "react";
import editIcon from "../../../assets/icons/edit.svg";

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
          <button
            type="button"
            className="monthly-event-icon-button"
            onClick={() => onEdit(event)}
            aria-label={`Modifier ${event.title}`}
          >
            <img src={editIcon} alt="" aria-hidden="true" />
          </button>
        </div>
        <h3>{event.title}</h3>
        <strong>{formatEventAmount(event.amount, event.currency)}</strong>
        <p>À partir du {formatEventDate(event.startDate)}</p>
        <p>
          {event.recurrence === "MENSUELLE"
            ? `Chaque mois${
                event.endDate
                  ? ` jusqu’au ${formatEventDate(event.endDate)}`
                  : ""
              }`
            : "Une seule fois"}
        </p>
      </article>
    ))}
  </div>
);

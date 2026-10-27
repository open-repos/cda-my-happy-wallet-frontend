import { ActionButton } from "../Actions/ActionButton";
import React from "react";
import { formatMoney, longDate } from "./budgetFormat";
const OccurrenceItem = ({ occurrence, disabled, onRealize, onCancel }) => (
  <li
    className={`budget-occurrence${
      occurrence.overdue ? " budget-occurrence--overdue" : ""
    }`}
  >
    <div className="budget-occurrence__main">
      <span className="budget-occurrence__date">
        {occurrence.overdue && (
          <span className="budget-occurrence__warning" aria-hidden="true">
            ⚠
          </span>
        )}
        {longDate(occurrence.occurrenceDate)}
        {occurrence.overdue && <span className="sr-only"> (en retard)</span>}
      </span>
      <strong>{occurrence.title}</strong>
      <span
        className={
          occurrence.kind === "ENTREE"
            ? "budget-amount--positive"
            : "budget-amount--negative"
        }
      >
        {formatMoney(
          occurrence.kind === "ENTREE"
            ? occurrence.amount
            : -Number(occurrence.amount),
          occurrence.currency,
          {
            signed: true,
          }
        )}{" "}
        prévu
      </span>
    </div>
    <div className="budget-occurrence__actions">
      <ActionButton
        action="convert"
        type="button"
        className="monthly-event-button"
        disabled={disabled}
        onClick={() => onRealize(occurrence)}
        aria-label={`Convertir ${occurrence.title} du ${longDate(
          occurrence.occurrenceDate
        )} en opération`}
      >
        Convertir en opération
      </ActionButton>
      <ActionButton
        action="cancel"
        type="button"
        className="monthly-event-button monthly-event-button--secondary"
        disabled={disabled}
        onClick={() => onCancel(occurrence)}
        aria-label={`Annuler ${occurrence.title} du ${longDate(
          occurrence.occurrenceDate
        )}`}
      >
        Annuler
      </ActionButton>
    </div>
  </li>
);

/** Événements planifiés sans décision : en retard d'abord, puis à venir. */
export const PendingOccurrences = ({
  occurrences,
  disabled,
  onRealize,
  onCancel,
}) => {
  const overdue = occurrences.filter((item) => item.overdue);
  const upcoming = occurrences.filter((item) => !item.overdue);
  if (occurrences.length === 0) {
    return <p className="budget-help">Aucun événement à traiter.</p>;
  }
  const renderList = (items) => (
    <ul className="budget-occurrence-list">
      {items.map((occurrence) => (
        <OccurrenceItem
          key={`${occurrence.eventId}-${occurrence.occurrenceDate}`}
          occurrence={occurrence}
          disabled={disabled}
          onRealize={onRealize}
          onCancel={onCancel}
        />
      ))}
    </ul>
  );
  return (
    <>
      {overdue.length > 0 && (
        <section aria-labelledby="pending-overdue-title">
          <h3 id="pending-overdue-title" className="budget-subtitle">
            À traiter ({overdue.length})
          </h3>
          {renderList(overdue)}
        </section>
      )}
      {upcoming.length > 0 && (
        <section aria-labelledby="pending-upcoming-title">
          <h3 id="pending-upcoming-title" className="budget-subtitle">
            Prévus
          </h3>
          {renderList(upcoming)}
        </section>
      )}
    </>
  );
};

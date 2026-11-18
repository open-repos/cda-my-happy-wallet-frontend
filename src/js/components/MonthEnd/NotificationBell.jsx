import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../Actions/Button";
import { savingsMoney } from "../Savings/savingsFormat";
import { longDate, monthName, ofMonth } from "../BudgetCalendar/budgetFormat";
import { carryBeforeCorrection } from "../../utils/monthEnd";
import { attentionItems, useMonthEnd } from "./MonthEndContext";

const countLabel = (count) =>
  count === 0
    ? "Notifications, rien à traiter"
    : `Notifications, ${count} à traiter`;

const Item = ({ item, onNavigate, context }) => {
  if (item.type === "occurrence") {
    const { occurrence } = item;
    const amount = savingsMoney(
      occurrence.amountMinorUnits,
      occurrence.currency
    );
    return (
      <li className="notification-item">
        <span className="notification-item__icon" aria-hidden="true">
          ↓
        </span>
        <strong>Versement mensuel à confirmer</strong>
        <p>
          {occurrence.title} · {amount} prévus le{" "}
          {longDate(occurrence.operationDate)}.
        </p>
        <div className="month-end-actions month-end-actions--start">
          <Button
            variant="primary"
            busy={context.resolution.busy}
            onClick={() => context.resolve(occurrence, "CONFIRMED")}
          >
            Confirmer le virement
          </Button>
          <Link
            className="month-end-button-link"
            to="/coffre"
            onClick={onNavigate}
          >
            Voir le Coffre
          </Link>
        </div>
      </li>
    );
  }
  const { decision } = item;
  const money = (value) => savingsMoney(value, decision.currency);
  const result = decision.resultBeforeDecisionMinorUnits;
  return (
    <li className="notification-item">
      <span className="notification-item__icon" aria-hidden="true">
        {item.type === "review" ? "!" : result < 0 ? "▼" : "▲"}
      </span>
      <strong>
        {item.type === "review"
          ? `Décision ${ofMonth(decision.month)} à revoir`
          : `Décision ${ofMonth(decision.month)} en attente`}
      </strong>
      <p>
        {item.type === "review"
          ? `Une correction change le report : ${money(
              carryBeforeCorrection(decision)
            )} → ${money(decision.carryMinorUnits)}. Épargne inchangée.`
          : `${
              result < 0
                ? `Déficit de ${money(-result)}`
                : `${money(result)} disponibles`
            } fin ${monthName(
              decision.month
            )} · sans réponse, tout reste reporté.`}
      </p>
      <div className="month-end-actions month-end-actions--start">
        <Link
          className="month-end-button-link month-end-button-link--primary"
          to={`/fin-de-mois/${decision.month}`}
          onClick={onNavigate}
        >
          {item.type === "review" ? "Voir la décision" : "Décider"}
        </Link>
      </div>
    </li>
  );
};

/**
 * Cloche minimale de #396 : liste dérivée des lectures existantes, sans
 * historique ni état « lu » (centre complet : #414).
 */
export const NotificationBell = ({ className = "" }) => {
  const context = useMonthEnd();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const button = useRef(null);
  const panel = useRef(null);
  const items = attentionItems(context);
  const close = (restore) => {
    setOpen(false);
    if (restore) button.current?.focus();
  };
  useEffect(() => {
    if (!open) return undefined;
    (panel.current?.querySelector("a, button") ?? panel.current)?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const onPointer = (event) => {
      if (
        !panel.current?.contains(event.target) &&
        !button.current?.contains(event.target)
      )
        close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);
  if (!context) return null;
  const unavailable =
    context.decision.status === "error" ||
    context.occurrences.status === "error";
  return (
    <div className={`notification-bell ${className}`.trim()}>
      <button
        ref={button}
        type="button"
        className="notification-bell__button"
        aria-label={countLabel(items.length)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        <FontAwesomeIcon icon={faBell} aria-hidden="true" />
        {items.length > 0 && (
          <span className="notification-bell__count" aria-hidden="true">
            {items.length}
          </span>
        )}
      </button>
      <section
        ref={panel}
        id={panelId}
        className="notification-panel"
        aria-label="À traiter"
        tabIndex={-1}
        hidden={!open}
      >
        <h2>À traiter</h2>
        <p className="notification-panel__intro">
          Calculé à l’ouverture depuis vos données. Une entrée disparaît dès que
          l’action est faite.
        </p>
        {open && (
          <ul className="notification-list">
            {items.map((item) => (
              <Item
                key={
                  item.type === "occurrence"
                    ? `${item.occurrence.accountId}:${item.occurrence.month}`
                    : item.type
                }
                item={item}
                context={context}
                onNavigate={() => close(false)}
              />
            ))}
            {items.length === 0 && !unavailable && (
              <li className="notification-empty">
                <span aria-hidden="true">✓ </span>Rien à traiter pour le moment.
              </li>
            )}
            {unavailable && (
              <li className="notification-empty">
                Certains éléments n’ont pas pu être vérifiés.{" "}
                <button
                  type="button"
                  className="month-end-link"
                  onClick={() => {
                    context.decision.reload();
                    context.occurrences.reload();
                  }}
                >
                  Réessayer
                </button>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
};

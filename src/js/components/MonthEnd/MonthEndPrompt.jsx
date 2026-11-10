import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../Actions/Button";
import { savingsMoney } from "../Savings/savingsFormat";
import { monthName, ofMonth } from "../BudgetCalendar/budgetFormat";
import { needsDecision } from "../../utils/monthEnd";
import { ReviewNotice } from "./ReviewNotice";
import { shown, useMonthEnd } from "./MonthEndContext";

const path = (month) => `/fin-de-mois/${month}`;

/** Proposition de l'Accueil : bandeau, rappel après « Plus tard » ou avertissement. */
export const MonthEndPrompt = () => {
  const context = useMonthEnd();
  const decision = context ? shown(context.decision) : null;
  if (!decision) return null;
  const money = (value) => savingsMoney(value, decision.currency);
  const name = monthName(decision.month);
  const result = decision.resultBeforeDecisionMinorUnits;
  if (decision.requiresReview)
    return (
      <ReviewNotice decision={decision} titleId="month-end-prompt-title">
        <Link
          className="month-end-button-link month-end-button-link--primary"
          to={path(decision.month)}
        >
          Revoir la décision {ofMonth(decision.month)}
        </Link>
      </ReviewNotice>
    );
  if (!needsDecision(decision)) return null;
  if (context.later)
    return (
      <p className="month-end-reminder">
        <span>
          <span aria-hidden="true">⏳ </span>Décision {ofMonth(decision.month)}{" "}
          en attente · {money(result)}{" "}
          {result < 0 ? "de déficit reporté" : "reportés"} pour l’instant.
        </span>
        <Link to={path(decision.month)}>Décider maintenant</Link>
      </p>
    );
  const deficit = result < 0;
  return (
    <section
      className="month-end-banner"
      aria-labelledby="month-end-prompt-title"
    >
      <span className="month-end-banner__icon" aria-hidden="true">
        {deficit ? "▼" : "▲"}
      </span>
      <div>
        <p className="atelier-eyebrow">Fin de mois · {name}</p>
        <h2 id="month-end-prompt-title">
          {deficit
            ? `${name[0].toUpperCase()}${name.slice(
                1
              )} se termine avec un déficit de ${money(-result)}`
            : `Il vous reste ${money(result)} ${ofMonth(decision.month)}`}
        </h2>
        <p>
          {deficit
            ? "Voulez-vous le couvrir avec votre épargne ou une entrée exceptionnelle ?"
            : "Voulez-vous le reporter, l’épargner, ou répartir entre les deux ?"}{" "}
          Report du mois précédent inclus. Sans réponse,{" "}
          {deficit
            ? "le déficit reste reporté et réduit votre reste à vivre de ce mois."
            : "tout reste reporté et s’ajoute à votre reste à vivre de ce mois."}
        </p>
        <div className="month-end-actions month-end-actions--start">
          <Link
            className="month-end-button-link month-end-button-link--primary"
            to={path(decision.month)}
          >
            {deficit ? "Couvrir ou reporter" : "Décider maintenant"}
          </Link>
          <Button onClick={context.postpone}>Plus tard</Button>
        </div>
      </div>
    </section>
  );
};

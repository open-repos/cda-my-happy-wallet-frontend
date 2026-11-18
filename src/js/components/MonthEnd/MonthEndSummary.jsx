import React from "react";
import { Link } from "react-router-dom";
import { savingsMoney } from "../Savings/savingsFormat";
import { monthName, ofMonth } from "../BudgetCalendar/budgetFormat";
import { shiftMonth } from "../../utils/monthEnd";

/** Décision affichée dans le bilan d'un mois clos du calendrier (#396). */
export const MonthEndSummary = ({ summary }) => {
  const decision = summary.monthEndDecision;
  const path = `/fin-de-mois/${summary.month}`;
  const next = monthName(shiftMonth(summary.month, 1));
  if (!decision)
    return (
      <div className="month-end-summary">
        <h3>Décision de fin de mois</h3>
        <p>
          <span className="month-end-tag month-end-tag--pending">
            ⏳ Aucune décision
          </span>{" "}
          Tout le solde {ofMonth(summary.month)} est reporté sur {next}.
        </p>
        <Link className="month-end-button-link" to={path}>
          Décider du solde
        </Link>
      </div>
    );
  const money = (value, signed = false) =>
    savingsMoney(value, decision.currency, signed);
  const deficit = decision.resultBeforeDecisionMinorUnits < 0;
  return (
    <div className="month-end-summary">
      <h3>Décision de fin de mois</h3>
      <p>
        {decision.requiresReview ? (
          <span className="month-end-tag month-end-tag--warning">
            ! À revoir
          </span>
        ) : (
          <span className="month-end-tag month-end-tag--ok">✓ Décidée</span>
        )}{" "}
        Révision {decision.revision}
      </p>
      <dl className="budget-breakdown">
        <div className="budget-breakdown__row">
          <dt>
            {deficit ? "Déficit avant décision" : "Disponible avant décision"}
          </dt>
          <dd>{money(decision.resultBeforeDecisionMinorUnits)}</dd>
        </div>
        {deficit ? (
          <>
            <div className="budget-breakdown__row">
              <dt>Prélèvements d’épargne</dt>
              <dd>{money(decision.coverageMinorUnits, true)}</dd>
            </div>
            <div className="budget-breakdown__row">
              <dt>Entrée exceptionnelle</dt>
              <dd>{money(decision.exceptionalIncomeMinorUnits, true)}</dd>
            </div>
          </>
        ) : (
          <div className="budget-breakdown__row">
            <dt>Épargne</dt>
            <dd>{money(-decision.savingsMinorUnits, true)}</dd>
          </div>
        )}
        <div className="budget-breakdown__row budget-breakdown__row--total">
          <dt>
            {decision.carryMinorUnits < 0
              ? `Déficit reporté sur ${next}`
              : `Report sur ${next}`}
          </dt>
          <dd>{money(decision.carryMinorUnits, true)}</dd>
        </div>
      </dl>
      <Link className="month-end-button-link" to={path}>
        {decision.requiresReview
          ? "Revoir la décision"
          : "Modifier la décision"}
      </Link>
    </div>
  );
};

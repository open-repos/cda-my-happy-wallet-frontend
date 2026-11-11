import React from "react";
import { savingsMoney } from "../Savings/savingsFormat";
import { monthName, ofMonth } from "../BudgetCalendar/budgetFormat";
import { previewCarry, shiftMonth } from "../../utils/monthEnd";

const tone = (value) =>
  value < 0 ? "negative" : value > 0 ? "positive" : "neutral";

export const accountLabel = (accounts, accountId) =>
  accounts.find((account) => account.id === accountId)?.name ??
  `Compte n° ${accountId}`;

/**
 * Cascade lisible sans la couleur : signes explicites et libellés « Épargne »,
 * « Prélèvement », « Report » ou « Déficit reporté ».
 */
export const DecisionCalculation = ({
  decision,
  plan,
  accounts,
  preview = false,
  previousCarry = null,
}) => {
  const { currency, month } = decision;
  const result = decision.resultBeforeDecisionMinorUnits;
  const carry = previewCarry(result, plan);
  const next = monthName(shiftMonth(month, 1));
  const money = (value, signed = false) =>
    savingsMoney(value, currency, signed);
  const deficit = result < 0;
  return (
    <dl className="month-end-calc">
      <div>
        <dt>
          {deficit ? "Déficit" : "Disponible"} fin {monthName(month)}
          <span className="month-end-calc__hint">
            report {ofMonth(shiftMonth(month, -1))} inclus
          </span>
        </dt>
        <dd className={`month-end-amount--${tone(result)}`}>{money(result)}</dd>
      </div>
      {!deficit &&
        plan.savings.map((row) => (
          <div key={`s${row.accountId}`}>
            <dt>Épargne vers {accountLabel(accounts, row.accountId)}</dt>
            <dd>{money(-row.amountMinorUnits, true)}</dd>
          </div>
        ))}
      {deficit &&
        plan.coverage.map((row) => (
          <div key={`c${row.accountId}`}>
            <dt>Prélèvement sur {accountLabel(accounts, row.accountId)}</dt>
            <dd>{money(row.amountMinorUnits, true)}</dd>
          </div>
        ))}
      {deficit && plan.exceptionalIncomeMinorUnits > 0 && (
        <div>
          <dt>Entrée exceptionnelle</dt>
          <dd>{money(plan.exceptionalIncomeMinorUnits, true)}</dd>
        </div>
      )}
      <div className="month-end-calc__total">
        <dt>
          {preview ? "Aperçu · " : ""}
          {carry < 0 ? "Déficit reporté sur " : "Report sur "}
          {next}
        </dt>
        <dd className={`month-end-amount--${tone(carry)}`}>
          {previousCarry !== null && previousCarry !== carry && (
            <>
              <s className="month-end-calc__previous">{money(previousCarry)}</s>
              <span className="sr-only"> avant correction, désormais </span>
            </>
          )}
          {money(carry)}
        </dd>
      </div>
    </dl>
  );
};

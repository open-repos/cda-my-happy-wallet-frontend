import React from "react";
import { savingsMoney } from "../Savings/savingsFormat";
import { monthName } from "../BudgetCalendar/budgetFormat";
import { carryBeforeCorrection } from "../../utils/monthEnd";

/** Correction après décision : l'épargne décidée ne change jamais, seul le report. */
export const ReviewNotice = ({
  decision,
  titleId,
  headingLevel = 2,
  children,
}) => {
  const money = (value) => savingsMoney(value, decision.currency);
  const saved = decision.savingsMinorUnits;
  const Heading = `h${headingLevel}`;
  return (
    <section
      className="month-end-banner month-end-banner--warning"
      aria-labelledby={titleId}
    >
      <span className="month-end-banner__icon" aria-hidden="true">
        !
      </span>
      <div>
        <Heading id={titleId}>
          À revoir : {monthName(decision.month)} a changé après votre décision
        </Heading>
        <p>
          Une opération modifiée après la décision change le solde de{" "}
          {savingsMoney(
            decision.correctionDeltaMinorUnits,
            decision.currency,
            true
          )}
          .{" "}
          {saved > 0
            ? `Votre épargne reste à ${money(saved)} ; seul le report change : `
            : "Votre répartition est conservée ; seul le report change : "}
          <strong>
            {money(carryBeforeCorrection(decision))} →{" "}
            {money(decision.carryMinorUnits)}
          </strong>
          .
        </p>
        {children}
      </div>
    </section>
  );
};

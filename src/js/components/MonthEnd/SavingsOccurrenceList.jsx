import React from "react";
import { Button } from "../Actions/Button";
import { LiveMessage } from "../LiveMessage";
import { savingsMoney } from "../Savings/savingsFormat";
import { longDate } from "../BudgetCalendar/budgetFormat";
import { useMonthEnd } from "./MonthEndContext";

/**
 * Versements mensuels prévus des objectifs (#183) : la confirmation crée le
 * virement, le refus libère la réserve. Même file que la cloche.
 */
export const SavingsOccurrenceList = ({
  headingLevel = 2,
  title = "Virements prévus à confirmer",
}) => {
  const context = useMonthEnd();
  if (!context) return null;
  const { occurrences, resolution, resolve } = context;
  if (occurrences.status === "error" || occurrences.data.length === 0)
    return resolution.message ? (
      <LiveMessage message={resolution.message} isError={resolution.error} />
    ) : null;
  const Heading = `h${headingLevel}`;
  return (
    <section
      className="month-end-occurrences"
      aria-labelledby="savings-occurrences-title"
    >
      <Heading id="savings-occurrences-title">
        {title} ({occurrences.data.length})
      </Heading>
      <ul>
        {occurrences.data.map((occurrence) => {
          const amount = savingsMoney(
            occurrence.amountMinorUnits,
            occurrence.currency
          );
          const date = longDate(occurrence.operationDate);
          return (
            <li key={`${occurrence.accountId}:${occurrence.month}`}>
              <div>
                <strong>Versement mensuel · {occurrence.title}</strong>
                <span>
                  Prévu le {date} · {amount} du compte courant vers l’épargne
                </span>
              </div>
              <div className="month-end-actions month-end-actions--start">
                <Button
                  variant="primary"
                  busy={resolution.busy}
                  onClick={() => resolve(occurrence, "CONFIRMED")}
                  aria-label={`Confirmer le virement de ${amount} vers ${occurrence.title}, prévu le ${date}`}
                >
                  Confirmer le virement
                </Button>
                <Button
                  disabled={resolution.busy}
                  onClick={() => resolve(occurrence, "CANCELED")}
                  aria-label={`Ne pas verser les ${amount} prévus le ${date} pour ${occurrence.title}`}
                >
                  Ne pas verser
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="month-end-help">
        Refuser est définitif pour ce mois : la réserve prévue est libérée.
      </p>
      <LiveMessage message={resolution.message} isError={resolution.error} />
    </section>
  );
};

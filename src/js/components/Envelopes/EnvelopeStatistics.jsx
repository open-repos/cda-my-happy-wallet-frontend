import React from "react";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { percentLabel } from "../../utils/envelopes";
export const EnvelopeStatistics = ({ statistics: s, currency }) => (
  <div className="envelope-statistics">
    {s.sampleMonths === 0 ? (
      <p>
        Pas encore de mois terminé avec des dépenses rattachées pour calculer
        une moyenne.
      </p>
    ) : (
      <>
        <dl>
          <div>
            <dt>Dépense réelle moyenne / mois</dt>
            <dd>{formatMoney(s.meanActual, currency)}</dd>
          </div>
          <div>
            <dt>Budget moyen / mois</dt>
            <dd>{formatMoney(s.meanPlanned, currency)}</dd>
          </div>
          <div>
            <dt>Écart moyen au budget</dt>
            <dd>{formatMoney(s.meanVariance, currency, { signed: true })}</dd>
          </div>
          <div>
            <dt>Dépassement positif moyen / mois</dt>
            <dd>{formatMoney(s.meanOverrun, currency)}</dd>
          </div>
        </dl>
        <p>
          Budget dépassé {s.exceededMonths} mois sur {s.sampleMonths} (
          {percentLabel(s.overrunRate)}).
        </p>
      </>
    )}
    <p className="envelope-help">
      {s.sampleMonths} mois analysé{s.sampleMonths > 1 ? "s" : ""} ;{" "}
      {s.unreconciledMonthsExcluded} mois sans suivi complet et{" "}
      {s.incompleteMonthsExcluded} mois courant ou futurs exclus. Les mois
      historiques absents ne sont pas assimilés à zéro.
    </p>
  </div>
);

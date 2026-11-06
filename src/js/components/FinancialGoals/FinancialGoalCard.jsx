import { ActionButton } from "../Actions/ActionButton";
import { SavingsTrajectorySimulation } from "./SavingsTrajectorySimulation";
import React, { useMemo, useState } from "react";
import { EChart } from "../charts/EChart";
import {
  goalGaugeOption,
  goalTrajectoryOption,
} from "../charts/goalTrajectoryChartOptions";
import { useChartTokens } from "../charts/useChartTokens";
import {
  formatMoney,
  longDate,
  monthLabel,
} from "../BudgetCalendar/budgetFormat";
import {
  GOAL_STATUS_LABELS,
  forecastMessage,
  goalPercent,
} from "../../utils/financialGoals";
import { goalTrajectoryPoints } from "../../utils/goalTrajectory";
import { shiftForecastMonth } from "../../utils/budgetForecast";

/** Declared progress and the existing server forecast stay separate. */
export const FinancialGoalCard = ({ goal, onEdit, onRefresh }) => {
  const [comparing, setComparing] = useState(false);
  const tokens = useChartTokens();
  const [horizon, setHorizon] = useState(12);
  const percent = goalPercent(goal);
  const gauge = useMemo(
    () => goalGaugeOption(percent, tokens),
    [percent, tokens]
  );
  const points = useMemo(
    () => goalTrajectoryPoints(goal, horizon),
    [goal, horizon]
  );
  const trajectory = useMemo(
    () => goalTrajectoryOption(goal, points, tokens),
    [goal, points, tokens]
  );
  const money = (amount) => formatMoney(amount, goal.currency);
  const titleId = `goal-${goal.id}-title`;
  const reach = goal.forecast.estimatedReachMonth;
  const reached = goal.forecast.status === "REACHED";
  const beyond =
    reach && reach > shiftForecastMonth(goal.forecast.referenceMonth, horizon);
  return (
    <article className="goal-card" aria-labelledby={titleId}>
      <div className="goal-card__header">
        <h3 id={titleId}>{goal.title}</h3>
        <span className={`goal-status goal-status--${goal.forecast.status}`}>
          {GOAL_STATUS_LABELS[goal.forecast.status]}
        </span>
      </div>
      <div className="goal-card__layout">
        <div className="goal-card__summary">
          <div className="goal-card__gauge">
            <EChart
              className="goal-card__gauge-chart"
              option={gauge}
              label={`${percent} % de l’objectif ${
                goal.title
              } atteint : ${money(goal.savedAmount)} sur ${money(
                goal.targetAmount
              )}`}
            />
            <p className="goal-card__gauge-label" aria-hidden="true">
              <strong>{percent} %</strong>
              <span>déjà constitués</span>
            </p>
          </div>
          <p className="goal-card__help">
            Montant déclaré ; les versements prévus n’augmentent pas cette
            jauge.
          </p>
          <div className="goal-card__arrival">
            <span>Atteinte estimée au rythme prévu</span>
            <strong>
              {reached ? (
                "Objectif atteint"
              ) : reach ? (
                <time dateTime={reach}>{monthLabel(reach)}</time>
              ) : (
                "Non calculable"
              )}
            </strong>
          </div>
          <dl className="goal-card__facts">
            {[
              ["Montant visé", money(goal.targetAmount)],
              ["Déjà épargné", money(goal.savedAmount)],
              ["Reste à épargner", money(goal.forecast.remainingAmount)],
              ["Versement mensuel", money(goal.monthlyContribution)],
              [
                "Date souhaitée",
                goal.targetDate ? longDate(goal.targetDate) : "Aucune",
              ],
              [
                "Requis pour tenir la date",
                goal.forecast.requiredMonthlyContribution === null
                  ? "Non calculable"
                  : money(goal.forecast.requiredMonthlyContribution),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="goal-card__forecast">{forecastMessage(goal)}</p>
          <ActionButton
            action="edit"
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={(event) => onEdit(goal, event.currentTarget)}
            aria-label={`Modifier l’objectif ${goal.title}`}
          >
            Modifier
          </ActionButton>
        </div>
        <section
          className="goal-trajectory"
          aria-labelledby={`goal-${goal.id}-trajectory-title`}
        >
          <ActionButton
            action="simulate"
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={() => setComparing((value) => !value)}
            aria-expanded={comparing}
          >
            {comparing ? "Revenir au rythme prévu" : "Simuler avec mon budget"}
          </ActionButton>
          {comparing ? (
            <SavingsTrajectorySimulation goal={goal} onRefresh={onRefresh} />
          ) : (
            <>
              <div className="goal-trajectory__header">
                <h4 id={`goal-${goal.id}-trajectory-title`}>
                  Trajectoire au rythme prévu
                </h4>
                <label htmlFor={`goal-${goal.id}-horizon`}>
                  Horizon
                  <select
                    id={`goal-${goal.id}-horizon`}
                    value={horizon}
                    onChange={(event) => setHorizon(Number(event.target.value))}
                  >
                    <option value={12}>12 mois</option>
                    <option value={24}>24 mois</option>
                  </select>
                </label>
              </div>
              <p className="goal-card__help">
                Départ déclaré en {monthLabel(goal.forecast.referenceMonth)}.
                Premier versement projeté le mois suivant. Aucun historique
                reconstitué.
              </p>
              <EChart
                className="goal-trajectory__chart"
                option={trajectory}
                label={`Projection de l’objectif ${goal.title} en ${
                  goal.currency
                }, au rythme enregistré de ${money(
                  goal.monthlyContribution
                )} par mois. Les valeurs sont disponibles dans le tableau.`}
              />
              <p className="goal-card__help">
                ● Montant déclaré au départ · ○ Points mensuels projetés, reliés
                en pointillés · Repères : montant cible et mois souhaité
                lorsqu’il est dans la période tracée.
              </p>
              <p className="goal-trajectory__outcome" aria-live="polite">
                {beyond
                  ? `Objectif non atteint dans l’horizon affiché de ${horizon} mois.`
                  : !reached && goal.monthlyContribution === "0.00"
                  ? "Aucun versement prévu : aucune progression future n’est représentée."
                  : !reached && !reach
                  ? "Aucune date d’atteinte calculable avec les données actuelles."
                  : null}
              </p>
              <p className="goal-card__help">
                Cette projection suit votre versement enregistré. La synthèse de
                capacité ci-dessous évalue séparément le budget de tous vos
                objectifs.
              </p>
              <details className="goal-trajectory__details">
                <summary>Lire les montants projetés</summary>
                <table>
                  <caption>
                    Épargne déclarée et projection en {goal.currency}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Mois</th>
                      <th scope="col">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point, index) => (
                      <tr key={point.month}>
                        <th scope="row">
                          {monthLabel(point.month)}
                          {index === 0 ? " · déclaré" : " · projeté"}
                        </th>
                        <td>{money(point.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </section>
      </div>
    </article>
  );
};

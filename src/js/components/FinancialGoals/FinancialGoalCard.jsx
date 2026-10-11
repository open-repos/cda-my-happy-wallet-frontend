import React, { useMemo } from "react";
import { EChart } from "../charts/EChart";
import { goalsRingOption } from "../charts/homeChartOptions";
import { useChartTokens } from "../charts/useChartTokens";
import { formatMoney, longDate } from "../BudgetCalendar/budgetFormat";
import {
  GOAL_STATUS_LABELS,
  forecastMessage,
  goalPercent,
} from "../../utils/financialGoals";

/** Carte d'un objectif : anneau d'atteinte, montants et prévision. */
export const FinancialGoalCard = ({ goal, onEdit }) => {
  const tokens = useChartTokens();
  const percent = goalPercent(goal);
  const option = useMemo(
    () => goalsRingOption({ percent }, tokens),
    [percent, tokens]
  );
  const money = (amount) => formatMoney(amount, goal.currency);
  const titleId = `goal-${goal.id}-title`;
  return (
    <article className="goal-card" aria-labelledby={titleId}>
      <div className="goal-card__header">
        <h3 id={titleId}>{goal.title}</h3>
        <span className={`goal-status goal-status--${goal.forecast.status}`}>
          {GOAL_STATUS_LABELS[goal.forecast.status]}
        </span>
      </div>
      <EChart
        className="goal-card__ring"
        option={option}
        label={`${percent} % de l’objectif ${goal.title} atteint : ${money(
          goal.savedAmount
        )} sur ${money(goal.targetAmount)}`}
      />
      <dl className="goal-card__facts">
        <div>
          <dt>Montant visé</dt>
          <dd>{money(goal.targetAmount)}</dd>
        </div>
        <div>
          <dt>Déjà épargné</dt>
          <dd>{money(goal.savedAmount)}</dd>
        </div>
        <div>
          <dt>Versement mensuel</dt>
          <dd>{money(goal.monthlyContribution)}</dd>
        </div>
        <div>
          <dt>Date souhaitée</dt>
          <dd>{goal.targetDate ? longDate(goal.targetDate) : "Aucune"}</dd>
        </div>
      </dl>
      <p className="goal-card__forecast">{forecastMessage(goal)}</p>
      <button
        type="button"
        className="monthly-event-button monthly-event-button--secondary"
        onClick={(event) => onEdit(goal, event.currentTarget)}
        aria-label={`Modifier l’objectif ${goal.title}`}
      >
        Modifier
      </button>
    </article>
  );
};

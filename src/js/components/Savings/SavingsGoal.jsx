import React from "react";
import { Link } from "react-router-dom";
import { savingsMoney } from "./savingsFormat";
import { parseHundredths } from "../../utils/decimalInput";
import { goalPercent } from "../../utils/financialGoals";

export const SavingsGoal = ({ goal }) => {
  const percent = goalPercent(goal);
  return (
    <div className="savings-goal">
      <div className="savings-row">
        <strong>{goal.title}</strong>
        <span>{percent} %</span>
      </div>
      <progress
        max={100}
        value={percent}
        aria-label={`Progression de ${goal.title}`}
      />
      <p>
        {savingsMoney(parseHundredths(goal.savedAmount), goal.currency)} sur{" "}
        {savingsMoney(parseHundredths(goal.targetAmount), goal.currency)}
      </p>
      <Link to="/objectifs-evenements">Voir l’objectif</Link>
    </div>
  );
};

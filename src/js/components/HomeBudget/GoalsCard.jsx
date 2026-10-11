import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { EChart } from "../charts/EChart";
import { goalsRingOption } from "../charts/homeChartOptions";
import { useChartTokens } from "../charts/useChartTokens";
import { SectionState } from "./SectionState";

/** Anneau d'atteinte (ECharts) : le conteneur porte un libellé complet. */
const ProgressRing = ({ progress, currency }) => {
  const tokens = useChartTokens();
  const option = useMemo(
    () => goalsRingOption(progress, tokens),
    [progress, tokens]
  );
  return (
    <EChart
      className="home-ring"
      option={option}
      label={`${progress.percent} % de l’épargne visée atteinte : ${formatMoney(
        progress.saved,
        currency
      )} sur ${formatMoney(progress.target, currency)}`}
    />
  );
};

export const GoalsCard = ({ section, currency }) => (
  <article className="home-budget__card" aria-labelledby="home-goals-title">
    <h2 id="home-goals-title">Mes objectifs</h2>
    {section.status !== "success" ? (
      <SectionState
        status={section.status}
        loadingText="Chargement des objectifs…"
        errorText="Les objectifs n’ont pas pu être chargés."
        onRetry={section.reload}
      />
    ) : section.data === null ? (
      <p className="home-budget__empty">Vous n’avez pas encore d’objectif.</p>
    ) : (
      <>
        <ProgressRing progress={section.data} currency={currency} />
        <ul className="home-goals">
          {section.data.goals.map((goal) => (
            <li key={goal.id}>
              <span>{goal.title}</span>
              <span>
                {formatMoney(goal.saved, currency)} /{" "}
                {formatMoney(goal.target, currency)} ({goal.percent} %)
              </span>
            </li>
          ))}
        </ul>
      </>
    )}
    <Link className="home-budget__button" to="/objectifs-evenements">
      Ajouter un objectif
    </Link>
  </article>
);

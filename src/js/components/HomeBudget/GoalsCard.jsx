import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { SectionState } from "./SectionState";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anneau d'atteinte : l'image porte un libellé complet pour les lecteurs d'écran. */
const ProgressRing = ({ progress, currency }) => (
  <svg
    className="home-ring"
    viewBox="0 0 120 120"
    role="img"
    aria-label={`${
      progress.percent
    } % de l’épargne visée atteinte : ${formatMoney(
      progress.saved,
      currency
    )} sur ${formatMoney(progress.target, currency)}`}
  >
    <circle className="home-ring__track" cx="60" cy="60" r={RADIUS} />
    <circle
      className="home-ring__value"
      cx="60"
      cy="60"
      r={RADIUS}
      strokeDasharray={CIRCUMFERENCE}
      strokeDashoffset={CIRCUMFERENCE * (1 - progress.percent / 100)}
      transform="rotate(-90 60 60)"
    />
    <text className="home-ring__percent" x="60" y="60" aria-hidden="true">
      {progress.percent} %
    </text>
    <text className="home-ring__caption" x="60" y="80" aria-hidden="true">
      atteint
    </text>
  </svg>
);

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

import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import {
  CarryHelp,
  RealBreakdown,
  toneOf,
} from "../BudgetCalendar/BudgetSummary";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { periodRemaining } from "../../utils/homeBudget";
import { SectionState } from "./SectionState";

export const HOME_PERIODS = [
  { value: "mois", label: "Mois", caption: "Reste à vivre du mois" },
  {
    value: "semaine",
    label: "Semaine",
    caption: "Reste à vivre sur 7 jours",
    cappedCaption: (days) =>
      `Reste à vivre sur ${days} jour${days > 1 ? "s" : ""}`,
  },
  { value: "jour", label: "Jour", caption: "Reste à vivre aujourd’hui" },
];

/** Commande Mois | Semaine | Jour : groupe de boutons radio natifs. */
export const PeriodToggle = ({ period, onChange }) => (
  <fieldset className="budget-mode__group home-budget__periods">
    <legend className="sr-only">Période du reste à vivre</legend>
    {HOME_PERIODS.map((option) => (
      <label
        key={option.value}
        className={`budget-mode__option${
          option.value === period ? " budget-mode__option--active" : ""
        }`}
      >
        <input
          type="radio"
          name="home-period"
          value={option.value}
          checked={option.value === period}
          onChange={() => onChange(option.value)}
        />
        {option.label}
      </label>
    ))}
  </fieldset>
);

const dayCount = (days) => `${days} jour${days > 1 ? "s" : ""}`;

/** Explication du calcul de la part hebdomadaire ou journalière. */
const ShareHelp = ({ summary, share, period }) => {
  const { currency } = summary;
  if (share.amount === null) {
    return (
      <p className="budget-help">
        Le mois est terminé : il ne reste aucun jour à répartir.
      </p>
    );
  }
  const daily =
    share.basis === "prudent"
      ? summary.forecast.prudentDailyAllowance
      : summary.realDailyAllowance;
  const spread =
    share.basis === "prudent"
      ? `Le disponible prudent répartit votre reste prévisionnel (${formatMoney(
          summary.forecast.forecastRemaining,
          currency
        )}), qui tient compte des événements prévus et de l’épargne des objectifs,`
      : `Le disponible réel répartit votre reste réel (${formatMoney(
          summary.realRemaining,
          currency
        )})`;
  return (
    <p className="budget-help">
      {formatMoney(daily, currency)} par jour × {dayCount(share.days)}. {spread}{" "}
      sur les {dayCount(summary.remainingDays)} restants du mois, jour courant
      inclus.
      {period === "semaine" && share.days < 7
        ? " La semaine est limitée aux jours restants du mois."
        : ""}
      {Number(share.amount) < 0
        ? " Un montant négatif indique l’effort nécessaire pour finir le mois à l’équilibre."
        : ""}
    </p>
  );
};

/** Montant principal de l'accueil et explication du calcul pour la période. */
export const RemainingToLive = ({ section, period }) => {
  if (section.status !== "success") {
    return (
      <SectionState
        status={section.status}
        loadingText="Chargement du reste à vivre…"
        errorText="Le reste à vivre n’a pas pu être chargé."
        onRetry={section.reload}
      />
    );
  }
  const summary = section.data;
  const share = periodRemaining(summary, period);
  const option = HOME_PERIODS.find((item) => item.value === period);
  const caption =
    option.cappedCaption && share.days > 0 && share.days < 7
      ? option.cappedCaption(share.days)
      : option.caption;
  return (
    <section
      className="home-budget__remaining"
      aria-labelledby="home-rav-title"
    >
      <h1 id="home-rav-title" className="home-budget__caption">
        {caption}
      </h1>
      <p
        className={`home-budget__amount budget-amount--${
          share.amount === null ? "neutral" : toneOf(share.amount)
        }`}
        aria-live="polite"
      >
        {share.amount === null
          ? "—"
          : formatMoney(share.amount, summary.currency)}
      </p>
      <div className="home-budget__explanation">
        {period === "mois" ? (
          <>
            <RealBreakdown summary={summary} />
            <CarryHelp summary={summary} />
          </>
        ) : (
          <ShareHelp summary={summary} share={share} period={period} />
        )}
      </div>
      <Link className="home-budget__edit" to="/home/operations-fixes">
        Modifier vos charges et revenus{" "}
        <FontAwesomeIcon icon={faEdit} aria-hidden="true" />
      </Link>
    </section>
  );
};

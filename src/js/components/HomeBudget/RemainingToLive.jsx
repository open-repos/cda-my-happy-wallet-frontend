import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import {
  CarryHelp,
  RealBreakdown,
  toneOf,
} from "../BudgetCalendar/BudgetSummary";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { budgetComparison, calculationBreakdown } from "../../utils/homeBudget";
import { FormDialog } from "../Forms/FormDialog";
import { SectionAnnouncement, SectionState } from "./SectionState";

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

const TEXTS = {
  loadingText: "Chargement du reste à vivre…",
  errorText: "Le reste à vivre n’a pas pu être chargé.",
};

const periodDifference = (difference, period, days) => {
  const amount = difference.startsWith("-") ? difference.slice(1) : difference;
  const direction =
    Number(difference) < 0
      ? "de moins"
      : Number(difference) > 0
      ? "de plus"
      : null;
  const suffix =
    period === "jour"
      ? "par jour"
      : period === "semaine"
      ? `sur ${dayCount(days)}`
      : "ce mois-ci";
  return { amount, direction, suffix };
};

/** Relie le reste réel détaillé au montant actualisé affiché pour le mois. */
const ForecastBridge = ({ summary }) =>
  summary.forecast ? (
    <p className="budget-help">
      Le reste à vivre actualisé (
      {formatMoney(summary.forecast.forecastRemaining, summary.currency)}) part
      de ce reste réel, ajoute les entrées prévues et retire les dépenses
      prévues
      {summary.forecast.envelopeReserve !== undefined
        ? ", la réserve des enveloppes"
        : ""}{" "}
      et l’épargne des objectifs. Le détail du calcul donne chaque montant.
    </p>
  ) : null;

const CalculationDetail = ({ summary, onClose }) => (
  <FormDialog
    label="Détail du calcul"
    onClose={onClose}
    closeLabel="Fermer le détail du calcul"
    restoreFocus
    surfaceClassName="home-budget__detail"
  >
    <div className="home-budget__detail-heading">
      <h2>Détail du calcul</h2>
      <button type="button" className="budget-link-button" onClick={onClose}>
        Fermer
      </button>
    </div>
    <p className="budget-help">
      Chaque ligne reprend une valeur du résumé calculé par le serveur.
    </p>
    <dl className="budget-breakdown home-budget__calculation">
      {calculationBreakdown(summary).map((row, index, rows) => (
        <div
          key={row.key}
          className={`budget-breakdown__row${
            index === rows.length - 1 ? " budget-breakdown__row--total" : ""
          }`}
        >
          <dt>{row.label}</dt>
          <dd className={`budget-amount--${toneOf(row.amount)}`}>
            {formatMoney(row.amount, summary.currency, {
              signed: index > 0 && index < rows.length - 1,
            })}
          </dd>
        </div>
      ))}
    </dl>
  </FormDialog>
);

/** Montant principal de l'accueil et explication du calcul pour la période. */
export const RemainingToLive = ({ section, period }) => {
  const [showsDetail, setShowsDetail] = useState(false);
  // Premier enfant identique dans chaque rendu : React garde ces régions
  // live montées d'un état à l'autre (#164).
  const announcement = (
    <SectionAnnouncement
      status={section.status}
      loadingKey={section.loadingKey}
      {...TEXTS}
    />
  );
  if (section.status !== "success") {
    return (
      <>
        {announcement}
        <SectionState
          status={section.status}
          {...TEXTS}
          onRetry={section.reload}
        />
      </>
    );
  }
  const summary = section.data;
  const comparison = budgetComparison(summary, period);
  const share = comparison.actual;
  const option = HOME_PERIODS.find((item) => item.value === period);
  const caption =
    option.cappedCaption && share.days > 0 && share.days < 7
      ? option.cappedCaption(share.days)
      : option.caption;
  const difference =
    comparison.difference === null
      ? null
      : periodDifference(comparison.difference, period, share.days);
  const currentMonth = budgetComparison(summary, "mois");
  return (
    <>
      {announcement}
      <section
        className="home-budget__remaining"
        aria-labelledby="home-rav-title"
      >
        <h2 id="home-rav-title" className="home-budget__caption">
          {caption}
        </h2>
        <div
          className={`home-budget__amount budget-amount--${
            share.amount === null ? "neutral" : toneOf(share.amount)
          }`}
          aria-live="polite"
        >
          <span className="home-budget__amount-current">
            {share.amount === null
              ? "—"
              : formatMoney(share.amount, summary.currency)}
          </span>
          <span className="home-budget__amount-theoretical">
            {" / "}
            {comparison.theoretical.amount === null
              ? "—"
              : formatMoney(comparison.theoretical.amount, summary.currency)}
          </span>
        </div>
        {comparison.progress !== null && (
          <progress
            className="home-budget__progress"
            max="100"
            value={comparison.progress}
            aria-label={`Reste à vivre actualisé ${formatMoney(
              share.amount,
              summary.currency
            )} sur ${formatMoney(
              comparison.theoretical.amount,
              summary.currency
            )} théorique`}
          />
        )}
        {difference && (
          <p className="home-budget__difference">
            {difference.direction === null
              ? `Égal à votre part théorique ${difference.suffix}.`
              : `${formatMoney(difference.amount, summary.currency)} ${
                  difference.direction
                } ${difference.suffix} que votre part théorique.`}
          </p>
        )}
        <div className="home-budget__explanation">
          {period === "mois" ? (
            <>
              <RealBreakdown summary={summary} />
              <CarryHelp summary={summary} />
              <ForecastBridge summary={summary} />
            </>
          ) : (
            <ShareHelp summary={summary} share={share} period={period} />
          )}
        </div>
        <div
          className="home-budget__month-comparison"
          role="group"
          aria-label="Ce mois-ci"
        >
          <h3>Ce mois-ci</h3>
          <dl>
            <div>
              <dt>Actualisé</dt>
              <dd>
                {formatMoney(currentMonth.actual.amount, summary.currency)}
              </dd>
            </div>
            <div>
              <dt>Théorique</dt>
              <dd>{formatMoney(summary.base, summary.currency)}</dd>
            </div>
          </dl>
          <p>
            Le théorique correspond aux revenus fixes moins les charges fixes.
          </p>
        </div>
        <button
          type="button"
          className="budget-link-button"
          onClick={() => setShowsDetail(true)}
        >
          Voir le détail du calcul
        </button>
        <Link className="home-budget__edit" to="/home/operations-fixes">
          Modifier vos charges et revenus{" "}
          <FontAwesomeIcon icon={faEdit} aria-hidden="true" />
        </Link>
      </section>
      {showsDetail && (
        <CalculationDetail
          summary={summary}
          onClose={() => setShowsDetail(false)}
        />
      )}
    </>
  );
};

import React from "react";
import {
  formatMoney,
  monthLabel,
  ofMonth,
  timestampDate,
} from "./budgetFormat";

const balanceLabels = {
  POSITIVE: "Positif",
  BALANCED: "À l’équilibre",
  NEGATIVE: "Négatif",
};

export const toneOf = (amount) =>
  Number(amount) < 0 ? "negative" : Number(amount) > 0 ? "positive" : "neutral";

/** Décomposition explicite : report du mois précédent + résultat du mois. */
export const RealBreakdown = ({ summary }) => (
  <dl className="budget-breakdown">
    {summary.carryFromMonth && (
      <div className="budget-breakdown__row budget-breakdown__row--carry">
        <dt>Report {ofMonth(summary.carryFromMonth)}</dt>
        <dd className={`budget-amount--${toneOf(summary.carryIn)}`}>
          {formatMoney(summary.carryIn, summary.currency, { signed: true })}
        </dd>
      </div>
    )}
    <div className="budget-breakdown__row">
      <dt>Résultat du mois</dt>
      <dd className={`budget-amount--${toneOf(summary.monthResult)}`}>
        {formatMoney(summary.monthResult, summary.currency, { signed: true })}
      </dd>
    </div>
    <div className="budget-breakdown__row budget-breakdown__row--total">
      <dt>Reste réel</dt>
      <dd>{formatMoney(summary.realRemaining, summary.currency)}</dd>
    </div>
  </dl>
);

export const CarryHelp = ({ summary }) =>
  summary.carryFromMonth ? (
    <p className="budget-help">
      {Number(summary.carryIn) < 0
        ? `Le déficit ${ofMonth(summary.carryFromMonth)} est déduit de ce mois.`
        : `Le reste ${ofMonth(
            summary.carryFromMonth
          )} est ajouté à ce mois.`}{" "}
      Le résultat du mois correspond à vos revenus et charges fixes, plus vos
      entrées, moins vos dépenses.
    </p>
  ) : null;

const CorrectionNotice = ({ summary }) =>
  summary.correctedAt ? (
    <p className="budget-notice budget-notice--info" role="status">
      Bilan corrigé le {timestampDate(summary.correctedAt)} après la
      modification d’une opération de ce mois. Les reports suivants ont été
      recalculés.
    </p>
  ) : null;

const ForecastCard = ({ summary }) => {
  const { forecast, currency } = summary;
  return (
    <article className="budget-card" aria-labelledby="budget-forecast-title">
      <h3 id="budget-forecast-title">Reste prévisionnel</h3>
      <p
        className={`budget-card__value budget-amount--${toneOf(
          forecast.forecastRemaining
        )}`}
      >
        {formatMoney(forecast.forecastRemaining, currency)}
      </p>
      <dl className="budget-breakdown">
        <div className="budget-breakdown__row">
          <dt>Reste réel</dt>
          <dd>{formatMoney(summary.realRemaining, currency)}</dd>
        </div>
        <div className="budget-breakdown__row">
          <dt>Dépenses prévues</dt>
          <dd className="budget-amount--negative">
            {formatMoney(-Number(forecast.plannedExpense), currency, {
              signed: true,
            })}
          </dd>
        </div>
        <div className="budget-breakdown__row">
          <dt>Entrées prévues</dt>
          <dd className="budget-amount--positive">
            {formatMoney(forecast.plannedIncome, currency, { signed: true })}
          </dd>
        </div>
        {Number(forecast.goalSavings) > 0 && (
          <div className="budget-breakdown__row">
            <dt>Épargne pour vos objectifs</dt>
            <dd className="budget-amount--negative">
              {formatMoney(-Number(forecast.goalSavings), currency, {
                signed: true,
              })}
            </dd>
          </div>
        )}
      </dl>
      {forecast.overdueCount > 0 && (
        <p className="budget-notice budget-notice--warning">
          {forecast.overdueCount} événement
          {forecast.overdueCount > 1 ? "s" : ""} en retard à traiter.
        </p>
      )}
    </article>
  );
};

/** Synthèse du mois : réel avec report, prévisionnel et disponible prudent. */
export const BudgetSummary = ({ summary, status, month, onRetry }) => {
  if (status === "loading") {
    return (
      // Annonce faite par la page, dans une région toujours montée (#164).
      <section className="budget-summary budget-summary--state">
        <p>Calcul de votre budget…</p>
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="budget-summary budget-summary--state">
        <p>Votre budget n’a pas pu être calculé.</p>
        <button
          type="button"
          className="monthly-event-button"
          onClick={onRetry}
        >
          Réessayer
        </button>
      </section>
    );
  }
  if (status === "future") {
    return (
      <section className="budget-summary budget-summary--state">
        <p>
          Le budget {monthLabel(month)} sera calculé à l’ouverture du mois. Les
          événements prévus restent visibles dans le calendrier.
        </p>
      </section>
    );
  }

  const { currency } = summary;
  if (summary.forecast === null) {
    return (
      <section
        className="budget-summary"
        aria-labelledby="budget-summary-title"
      >
        <h2 id="budget-summary-title">Bilan {ofMonth(summary.month)}</h2>
        <div className="budget-summary__grid budget-summary__grid--closed">
          <article className="budget-card">
            <h3>
              Bilan :{" "}
              <span
                className={`budget-balance budget-balance--${summary.balanceStatus.toLowerCase()}`}
              >
                {balanceLabels[summary.balanceStatus]}
              </span>
            </h3>
            <p
              className={`budget-card__value budget-amount--${toneOf(
                summary.realRemaining
              )}`}
            >
              {formatMoney(summary.realRemaining, currency)}
            </p>
            <RealBreakdown summary={summary} />
            <CarryHelp summary={summary} />
          </article>
        </div>
        <CorrectionNotice summary={summary} />
        {summary.unresolvedEvents > 0 && (
          <p className="budget-notice budget-notice--warning">
            {summary.unresolvedEvents} événement
            {summary.unresolvedEvents > 1 ? "s" : ""} de ce mois n’
            {summary.unresolvedEvents > 1 ? "ont" : "a"} pas été traité
            {summary.unresolvedEvents > 1 ? "s" : ""}.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="budget-summary" aria-labelledby="budget-summary-title">
      <h2 id="budget-summary-title" className="sr-only">
        Synthèse {ofMonth(summary.month)}
      </h2>
      <div className="budget-summary__grid">
        <article className="budget-card" aria-labelledby="budget-real-title">
          <h3 id="budget-real-title">Reste réel</h3>
          <p
            className={`budget-card__value budget-amount--${toneOf(
              summary.realRemaining
            )}`}
          >
            {formatMoney(summary.realRemaining, currency)}
          </p>
          <RealBreakdown summary={summary} />
          <CarryHelp summary={summary} />
        </article>
        <ForecastCard summary={summary} />
        <article className="budget-card" aria-labelledby="budget-daily-title">
          <h3 id="budget-daily-title">Disponible prudent par jour</h3>
          <p
            className={`budget-card__value budget-amount--${toneOf(
              summary.forecast.prudentDailyAllowance ?? 0
            )}`}
          >
            {summary.forecast.prudentDailyAllowance === null
              ? "—"
              : formatMoney(summary.forecast.prudentDailyAllowance, currency)}
          </p>
          <p className="budget-help">
            Reste prévisionnel réparti sur {summary.remainingDays} jour
            {summary.remainingDays > 1 ? "s" : ""} restant
            {summary.remainingDays > 1 ? "s" : ""}, aujourd’hui compris.
            {Number(summary.forecast.forecastRemaining) < 0 &&
              " Une valeur négative indique l’effort quotidien pour revenir à l’équilibre."}
          </p>
        </article>
      </div>
      <CorrectionNotice summary={summary} />
    </section>
  );
};

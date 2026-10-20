import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBudgetForecast } from "../hooks/useBudgetForecast";
import {
  forecastQueryProblem,
  forecastToday,
  shiftForecastMonth,
} from "../utils/budgetForecast";
import {
  formatMoney,
  longDate,
  monthLabel,
} from "../components/BudgetCalendar/budgetFormat";
import { LiveMessage } from "../components/LiveMessage";
import { EChart } from "../components/charts/EChart";
import { useChartTokens } from "../components/charts/useChartTokens";
import { budgetForecastChartOption } from "../components/charts/budgetForecastChartOptions";
import "../../css/MonthlyEvents.css";
import "../../css/BudgetCalendar.css";
import "../../css/BudgetForecast.css";

const columns = [
  ["carryIn", "Report prévisionnel"],
  ["plannedIncome", "Entrées prévues"],
  ["plannedExpense", "Dépenses prévues"],
  ["goalSavings", "Épargne des objectifs"],
  ["forecastRemaining", "Reste de fin de mois"],
  ["prudentMonthlyAllowance", "Disponible par mois"],
  ["prudentWeeklyAllowance", "Disponible par semaine"],
  ["prudentDailyAllowance", "Disponible par jour"],
];

export default function UpcomingMonths() {
  const today = forecastToday();
  const [from, setFrom] = useState(today.slice(0, 7));
  const [months, setMonths] = useState(12);
  const query = { from, months, currency: "EUR" };
  const problem = forecastQueryProblem(query, today);
  const forecast = useBudgetForecast(query, problem);
  const tokens = useChartTokens();
  const data = forecast.data;
  const option = useMemo(
    () =>
      budgetForecastChartOption(
        data?.months || [],
        data?.currency || "EUR",
        tokens
      ),
    [data, tokens]
  );
  const message =
    problem ||
    (forecast.status === "loading"
      ? "Chargement des prévisions…"
      : forecast.status === "error"
      ? "Les prévisions n’ont pas pu être chargées."
      : "");

  return (
    <main className="monthly-events-page budget-forecast">
      <header className="monthly-events-header">
        <div>
          <p className="monthly-events-eyebrow">Planification</p>
          <h1>Prochains mois</h1>
          <p>Anticipez vos dépenses et votre épargne, mois après mois.</p>
        </div>
        <Link
          className="monthly-event-button monthly-event-button--secondary"
          to="/calendrier"
        >
          Calendrier
        </Link>
      </header>
      <section
        className="budget-forecast__panel"
        aria-label="Période de prévision"
      >
        <div className="budget-forecast__filters">
          <label htmlFor="forecast-from">
            À partir de
            <input
              id="forecast-from"
              type="month"
              value={from}
              min={today.slice(0, 7)}
              max={shiftForecastMonth(today.slice(0, 7), 23)}
              onChange={(event) => setFrom(event.target.value)}
              aria-invalid={Boolean(problem)}
              aria-describedby={problem ? "forecast-problem" : undefined}
            />
          </label>
          <label htmlFor="forecast-months">
            Horizon de prévision
            <select
              id="forecast-months"
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
            >
              {[3, 6, 12, 24].map((count) => (
                <option value={count} key={count}>
                  {count} mois
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="budget-help">
          La prévision part du solde réel courant et tient compte des événements
          prévus, des charges et revenus fixes et des versements mensuels
          actuels de vos objectifs.
        </p>
      </section>
      <LiveMessage
        message={message}
        isError={Boolean(problem) || forecast.status === "error"}
        visible={false}
      />
      {problem && (
        <p id="forecast-problem" className="budget-forecast__panel">
          {problem}
        </p>
      )}
      {!problem && forecast.status === "loading" && (
        <p className="budget-forecast__panel" aria-hidden="true">
          Chargement des prévisions…
        </p>
      )}
      {!problem && forecast.status === "error" && (
        <section className="budget-forecast__panel">
          <p aria-hidden="true">Les prévisions n’ont pas pu être chargées.</p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={forecast.reload}
          >
            Réessayer
          </button>
        </section>
      )}
      {!problem && forecast.status === "empty" && (
        <p className="budget-forecast__panel">
          Aucune prévision pour cette période.
        </p>
      )}
      {!problem && forecast.status === "success" && data && (
        <>
          <section
            className="budget-forecast__panel"
            aria-labelledby="forecast-chart-title"
          >
            <h2 id="forecast-chart-title">Reste prévisionnel de fin de mois</h2>
            <p className="budget-help">
              Prévision du {longDate(data.referenceDate)}. Solde réel de départ
              : {formatMoney(data.currentRealRemaining, data.currency)}.
            </p>
            <EChart
              className="budget-forecast__chart"
              option={option}
              label="Reste prévisionnel de fin de mois. Les montants détaillés sont disponibles dans le tableau suivant."
            />
            {data.months.some(
              (month) => Number(month.forecastRemaining) < 0
            ) && (
              <p className="budget-forecast__negative-note">
                Les mois signalés « Solde négatif » présentent des dépenses et
                réservations supérieures au solde prévisionnel disponible.
              </p>
            )}
          </section>
          <section
            className="budget-forecast__panel"
            aria-labelledby="forecast-table-title"
          >
            <h2 id="forecast-table-title">Détail par mois</h2>
            <p id="forecast-table-help" className="budget-help">
              Le disponible par mois correspond au reste de fin de mois. Le jour
              et la semaine répartissent ce reste sur les jours restants ; une
              semaine couvre au plus sept jours. Le tableau défile
              horizontalement sur petit écran.
            </p>
            <div
              className="budget-forecast__scroll"
              role="region"
              aria-label="Tableau des prévisions, défilement horizontal"
              aria-describedby="forecast-table-help"
              tabIndex={0}
            >
              <table className="budget-forecast__table">
                <caption className="sr-only">Prévisions mensuelles</caption>
                <thead>
                  <tr>
                    <th scope="col">Mois</th>
                    {columns.map(([key, label]) => (
                      <th key={key} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((month) => (
                    <tr key={month.month}>
                      <th scope="row">
                        {monthLabel(month.month)}
                        {Number(month.forecastRemaining) < 0 && (
                          <span className="budget-forecast__warning">
                            Solde négatif
                          </span>
                        )}
                      </th>
                      {columns.map(([key]) => (
                        <td
                          key={key}
                          className={
                            Number(month[key]) < 0
                              ? "budget-amount--negative"
                              : undefined
                          }
                        >
                          {formatMoney(month[key], data.currency)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

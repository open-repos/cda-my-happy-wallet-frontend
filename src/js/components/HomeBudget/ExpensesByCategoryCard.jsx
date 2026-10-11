import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { EChart } from "../charts/EChart";
import {
  EXPENSE_CHART_TYPES,
  expensesChartHeight,
  expensesChartOption,
} from "../charts/homeChartOptions";
import { useChartTokens } from "../charts/useChartTokens";
import { SectionState } from "./SectionState";

const ChartTypeToggle = ({ type, onChange }) => (
  <fieldset className="budget-mode__group home-budget__chart-types">
    <legend className="sr-only">Type de graphique</legend>
    {EXPENSE_CHART_TYPES.map((option) => (
      <label
        key={option.value}
        className={`budget-mode__option${
          option.value === type ? " budget-mode__option--active" : ""
        }`}
      >
        <input
          type="radio"
          name="home-expenses-chart"
          value={option.value}
          checked={option.value === type}
          onChange={() => onChange(option.value)}
        />
        {option.label}
      </label>
    ))}
  </fieldset>
);

const ExpensesChart = ({ rows, currency }) => {
  const [type, setType] = useState("bar");
  const tokens = useChartTokens();
  const option = useMemo(
    () => expensesChartOption(rows, type, tokens, currency),
    [rows, type, tokens, currency]
  );
  return (
    <>
      <ChartTypeToggle type={type} onChange={setType} />
      <EChart
        className={`home-chart home-chart--${type}`}
        option={option}
        style={{ height: `${expensesChartHeight(rows, type)}px` }}
        label={`Graphique des dépenses du mois par catégorie, ${
          rows.length
        } catégorie${
          rows.length > 1 ? "s" : ""
        }. Détail dans la liste qui suit.`}
      />
      <ul className="sr-only" aria-label="Dépenses par catégorie">
        {rows.map((row) => (
          <li key={row.id}>
            {row.name} : {formatMoney(row.amount, currency)}
          </li>
        ))}
      </ul>
    </>
  );
};

/** Dépenses réelles du mois par catégorie, en barres ou en secteurs (ECharts). */
export const ExpensesByCategoryCard = ({ section, currency }) => (
  <article className="home-budget__card" aria-labelledby="home-expenses-title">
    <h2 id="home-expenses-title">Mes dépenses du mois par catégories</h2>
    {section.status !== "success" ? (
      <SectionState
        status={section.status}
        loadingText="Chargement des dépenses…"
        errorText="Les dépenses du mois n’ont pas pu être chargées."
        onRetry={section.reload}
      />
    ) : section.data.length === 0 ? (
      <p className="home-budget__empty">
        Vous n’avez pas encore renseigné de dépense ce mois-ci.
      </p>
    ) : (
      <ExpensesChart rows={section.data} currency={currency} />
    )}
    <div className="home-budget__actions">
      <Link className="home-budget__button" to="/operations">
        Ajouter une dépense
      </Link>
      <Link
        className="home-budget__link"
        to="/analyses?metric=expense&groupBy=category&splitBy=none&chart=pie&period=month"
      >
        Explorer mes dépenses
      </Link>
    </div>
  </article>
);

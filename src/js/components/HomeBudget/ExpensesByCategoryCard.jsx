import React from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { SectionState } from "./SectionState";

/**
 * Graphique en barres des dépenses du mois. Chaque barre est décorative :
 * le libellé et le montant visibles de la ligne en sont l'équivalent textuel.
 */
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
      <ul className="home-chart" aria-label="Dépenses par catégorie">
        {section.data.map((row) => (
          <li key={row.id} className="home-chart__row">
            <span className="home-chart__label">{row.name}</span>
            <span className="home-chart__track" aria-hidden="true">
              <span
                className="home-chart__bar"
                style={{
                  width: `${Math.max(row.share * 100, 2)}%`,
                  ...(row.color ? { backgroundColor: row.color } : {}),
                }}
              />
            </span>
            <span className="home-chart__value">
              {formatMoney(row.amount, currency)}
            </span>
          </li>
        ))}
      </ul>
    )}
    <Link className="home-budget__button" to="/operations">
      Ajouter une dépense
    </Link>
  </article>
);

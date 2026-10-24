import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { budgetService } from "../../services/budgetService";
import { currentParisMonth } from "../../hooks/useHomeBudget";
import { useSimulation } from "../Simulation/SimulationContext";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";

/** Synthèse autoritaire : aucun total financier reconstruit depuis les listes. */
export const FixedBudgetSummary = ({ overview = false }) => {
  const { revision, scenario } = useSimulation();
  const revenus = useSelector((state) => state.operationsFixes.revenus.data);
  const [currency, setCurrency] = useState("EUR");
  const month = currentParisMonth();
  const key = `${month}:${currency}:${revision}:${scenario}`;
  const [state, setState] = useState({ status: "loading" });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: "loading", key });
    try {
      const summary = await budgetService.getSummary(
        month,
        currency,
        ...(scenario === "simulation" ? [scenario] : [])
      );
      if (latest.current === request)
        setState({ status: "success", summary, key });
    } catch {
      if (latest.current === request) setState({ status: "error", key });
    }
  }, [month, currency, scenario, key, revenus]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  const status = state.key === key ? state.status : "loading";
  const money = (value) =>
    value == null ? "Indisponible" : formatMoney(value, currency);
  return (
    <div className="fixed-budget-summary">
      {overview && (
        <>
          <div className="fixed-operations__summary-heading">
            <h2>Budget mensuel</h2>
            <div className="fixed-operations__budget-currency">
              <label
                htmlFor="fixed-summary-currency"
                className="fixed-operations__currency-label"
              >
                Devise des indicateurs
              </label>
              <select
                id="fixed-summary-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option>EUR</option>
                <option>USD</option>
              </select>
            </div>
          </div>
          <p className="fixed-operations__budget-context">
            Mois courant · {currency} · sans conversion
          </p>
        </>
      )}
      <LiveMessage
        message={
          status === "loading"
            ? "Chargement du budget…"
            : status === "error"
            ? "Le budget n’a pas pu être chargé."
            : ""
        }
        isError={status === "error"}
      />
      {status === "error" && (
        <button className="one-off-button" type="button" onClick={reload}>
          Réessayer le budget
        </button>
      )}
      {overview && status === "success" && (
        <>
          <dl className="fixed-operations__metrics">
            {[
              [
                "Entrées fixes mensuelles",
                "Entrées / mois",
                state.summary.fixedIncome,
              ],
              [
                "Charges personnelles mensuelles",
                "Mes charges / mois",
                state.summary.fixedExpense,
              ],
              ["Solde fixe mensuel", "Solde fixe / mois", state.summary.base],
            ].map(([label, title, value]) => (
              <div key={label}>
                <dt>{title}</dt>
                <dd aria-label={label}>{money(value)}</dd>
              </div>
            ))}
          </dl>
          <p className="fixed-operations__budget-context">
            Solde fixe avant opérations, événements et reports.
          </p>
        </>
      )}
      <details
        className="fixed-operations__remaining"
        open={overview ? undefined : true}
      >
        <summary hidden={!overview}>Voir le reste à vivre du mois</summary>
        <section aria-labelledby="fixed-summary-title">
          <h2 id="fixed-summary-title">
            {currency === "EUR"
              ? "Reste à vivre du mois en euros"
              : "Reste à vivre du mois en dollars"}
          </h2>
          {status === "success" && (
            <>
              <p className="fixed-budget-amount">
                {money(state.summary.realRemaining)}
              </p>
              <p>
                Dont {money(state.summary.fixedExpense)} de charges fixes
                mensuelles personnelles, déjà prises en compte dans ce montant.
              </p>
              <p>
                Ce montant inclut les opérations du mois et les reports. Les
                devises restent séparées.
              </p>
            </>
          )}
        </section>
      </details>
    </div>
  );
};

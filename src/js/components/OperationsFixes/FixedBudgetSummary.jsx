import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { budgetService } from "../../services/budgetService";
import { currentParisMonth } from "../../hooks/useHomeBudget";
import { useSimulation } from "../Simulation/SimulationContext";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";

/** Même synthèse que l'accueil : jamais de RaV déduit localement des listes. */
export const FixedBudgetSummary = () => {
  const { revision, scenario } = useSimulation();
  const revenus = useSelector((state) => state.operationsFixes.revenus.data);
  const month = currentParisMonth();
  const key = `${month}:${revision}:${scenario}`;
  const [state, setState] = useState({ status: "loading" });
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: "loading", key });
    try {
      const summary = await budgetService.getSummary(
        month,
        "EUR",
        ...(scenario === "simulation" ? [scenario] : [])
      );
      if (latest.current === request)
        setState({ status: "success", summary, key });
    } catch {
      if (latest.current === request) setState({ status: "error", key });
    }
  }, [month, scenario, key, revenus]);
  useEffect(() => {
    reload();
    return () => {
      latest.current += 1;
    };
  }, [reload]);
  const status = state.key === key ? state.status : "loading";
  return (
    <section
      className="fixed-budget-summary"
      aria-labelledby="fixed-summary-title"
    >
      <h2 id="fixed-summary-title">Reste à vivre du mois en euros</h2>
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
      {status === "success" && (
        <>
          <p className="fixed-budget-amount">
            {formatMoney(state.summary.realRemaining, "EUR")}
          </p>
          <p>
            Dont {formatMoney(state.summary.fixedExpense, "EUR")} de charges
            fixes mensuelles personnelles, déjà prises en compte dans ce
            montant.
          </p>
          <p>
            Ce montant inclut les opérations du mois et les reports. Les charges
            en dollars restent distinctes du budget en euros.
          </p>
        </>
      )}
    </section>
  );
};

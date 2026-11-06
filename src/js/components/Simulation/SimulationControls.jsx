import React from "react";
import { useSimulation } from "./SimulationContext";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import { useSimulationComparison } from "../../hooks/useSimulationComparison";
import { forecastToday } from "../../utils/budgetForecast";
import { formatMoney, monthLabel } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";
import "../../../css/MonthlyEvents.css";
import "../../../css/Simulation.css";

export const SimulationToggle = ({ compact = false }) => {
  const state = useSimulation();
  return (
    <div className="simulation-toggle">
      <label>
        <input
          type="checkbox"
          role="switch"
          aria-label="Simulation"
          checked={state.enabled}
          disabled={state.mutationStatus === "loading"}
          onChange={(event) => state.setEnabled(event.target.checked)}
        />{" "}
        Simulation
      </label>
      {!compact && (
        <p>
          {state.enabled
            ? "Simulation affichée : les éléments potentiels sont inclus dans les prévisions et la capacité d’épargne. Les opérations réelles restent inchangées."
            : "Les chiffres habituels excluent les éléments potentiels. Activez la Simulation pour voir leur effet."}
        </p>
      )}
    </div>
  );
};

const Comparison = ({ month }) => {
  const { enabled } = useSimulation();
  const state = useSimulationComparison(month);
  // Le calcul d’un mois ou d’une activation de la Simulation est
  // annoncé, pas l'actualisation après une modification (#171).
  const announcesLoading = useAnnouncesLoading(
    state.status,
    `${month}:${enabled}`
  );
  const message =
    state.status === "loading"
      ? "Calcul de l’écart de simulation…"
      : state.status === "error"
      ? "L’écart de simulation n’a pas pu être chargé."
      : "";
  return (
    <>
      <LiveMessage
        message={state.status === "loading" && !announcesLoading ? "" : message}
        isError={state.status === "error"}
        visible={false}
      />
      {enabled && (
        <section
          className="simulation-comparison"
          aria-label="Comparaison de la Simulation"
        >
          <h3>Reste prévu de {monthLabel(month)}</h3>
          {state.status === "loading" && <p aria-hidden="true">{message}</p>}
          {state.status === "error" && (
            <>
              <p aria-hidden="true">{message}</p>
              <button
                type="button"
                className="monthly-event-button"
                onClick={state.reload}
              >
                Réessayer la comparaison
              </button>
            </>
          )}
          {state.status === "success" && (
            <p>
              Prévision habituelle :{" "}
              <strong>
                {formatMoney(
                  state.standard.months[0].forecastRemaining,
                  state.standard.currency
                )}
              </strong>{" "}
              <span aria-hidden="true">→</span> Avec la Simulation :{" "}
              <strong>
                {formatMoney(
                  state.simulation.months[0].forecastRemaining,
                  state.simulation.currency
                )}
              </strong>
            </p>
          )}
        </section>
      )}
    </>
  );
};

export const SimulationReadout = ({
  month = forecastToday().slice(0, 7),
  showToggle = true,
}) => {
  const state = useSimulation();
  if (!state.available) return null;
  return (
    <>
      {showToggle && <SimulationToggle />}
      {month >= forecastToday().slice(0, 7) ? (
        <Comparison month={month} />
      ) : (
        state.enabled && <p>Les bilans des mois passés restent inchangés.</p>
      )}
    </>
  );
};
export const SimulationControls = ({ month }) => {
  const state = useSimulation();
  if (!state.available) return null;
  return (
    <section className="simulation-surface" aria-label="Simulation budgétaire">
      <h2>Simulation</h2>
      <SimulationReadout month={month} />
    </section>
  );
};

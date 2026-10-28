import React, { useEffect, useState } from "react";
import service from "../../services/operationsFixesService";
import {
  envelopeMonth,
  shiftEnvelopeMonth,
  effectiveMonthOptions,
} from "../../utils/envelopes";
import { useSimulation } from "../Simulation/SimulationContext";
import { formatMoney, monthLabel } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";
const Definitions = () => {
  const [month, setMonth] = useState(() =>
      shiftEnvelopeMonth(envelopeMonth(), 1)
    ),
    [retry, setRetry] = useState(0),
    [state, setState] = useState({ status: "loading", data: [] });
  const { revision } = useSimulation();
  useEffect(() => {
    let alive = true;
    setState({ status: "loading", data: [] });
    service
      .getMonthDefinitions(month)
      .then((data) => {
        if (alive) setState({ status: "success", data });
      })
      .catch(() => {
        if (alive) setState({ status: "error", data: [] });
      });
    return () => {
      alive = false;
    };
  }, [month, retry, revision]);
  return (
    <div>
      <label className="envelope-field">
        Définitions applicables pour
        <select
          aria-label="Définitions applicables pour"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {effectiveMonthOptions().map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </label>
      <LiveMessage
        message={
          state.status === "error"
            ? "Les définitions de ce mois n’ont pas pu être chargées."
            : state.status === "loading"
            ? "Chargement des définitions mensuelles…"
            : ""
        }
        isError={state.status === "error"}
      />
      {state.status === "error" && (
        <button
          type="button"
          className="one-off-button"
          onClick={() => setRetry((v) => v + 1)}
        >
          Réessayer les définitions
        </button>
      )}
      {state.status === "success" && (
        <>
          <ul className="envelope-payments">
            {state.data.map((r) => (
              <li key={r.idOperationFixe}>
                <span>
                  {r.titre} ·{" "}
                  {r.typeOperation === "REVENU"
                    ? "Entrée"
                    : r.isBudgetEnvelope
                    ? "Enveloppe"
                    : "Charge"}
                </span>
                <strong>
                  {" "}
                  {formatMoney(
                    r.montantMensuelPersonnel ?? r.montant,
                    r.devise
                  )}{" "}
                  / mois
                </strong>
              </li>
            ))}
          </ul>
          {!state.data.length && <p>Aucun élément fixe pour ce mois.</p>}
        </>
      )}
    </div>
  );
};
export const FixedMonthPreview = () => {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="fixed-month-preview"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Vérifier les charges et entrées du prochain mois</summary>
      {open && <Definitions />}
    </details>
  );
};

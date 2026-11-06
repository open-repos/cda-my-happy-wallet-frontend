import React, { useId } from "react";
import { LiveMessage } from "../LiveMessage";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import "../../../css/Envelopes.css";

export const EnvelopeAssignment = ({ assignment, busy, error, form }) => {
  const unique = useId();
  const { link, options, selectedId, selected, incompatible, suggestions } =
    assignment;
  return (
    <div className="envelope-assignment">
      <label htmlFor={`${unique}-envelope`}>Rattacher à une enveloppe</label>
      <select
        id={`${unique}-envelope`}
        form={form}
        value={selectedId ?? ""}
        disabled={
          busy || link.status !== "success" || Boolean(link.occurrence?.closed)
        }
        aria-invalid={Boolean(error || incompatible)}
        aria-describedby={`${unique}-help`}
        onChange={(e) =>
          assignment.choose(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">Aucun rattachement</option>
        {selectedId && !options.data.some((o) => o.id === selectedId) && (
          <option value={selectedId}>
            {selected?.title ?? "Enveloppe actuelle"} ·{" "}
            {selected?.month ?? "à vérifier"}
          </option>
        )}
        {options.data.map((o) => (
          <option key={o.id} value={o.id} disabled={o.closed}>
            {o.title} · {o.month} · {formatMoney(o.metrics.actual, o.currency)}{" "}
            / {formatMoney(o.metrics.planned, o.currency)}
            {o.closed ? " · Clôturé" : ""}
          </option>
        ))}
      </select>
      <p id={`${unique}-help`} className="envelope-help">
        Seulement les charges mensuelles marquées comme enveloppes. Le choix est
        explicite ; les entrées ne sont pas rapprochables.
      </p>
      {options.status === "loading" && (
        <p className="envelope-help">Chargement des enveloppes…</p>
      )}
      {(options.status === "error" || link.status === "error") && (
        <div>
          <p>Le suivi des enveloppes n’a pas pu être chargé.</p>
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            disabled={busy}
            onClick={assignment.reload}
          >
            Réessayer le rattachement
          </button>
        </div>
      )}
      {link.occurrence?.closed && (
        <p>
          Ce mois est clôturé. L’opération liée est conservée en lecture seule.
        </p>
      )}
      {incompatible && (
        <p>
          La date, la devise ou le type ne correspond plus à l’enveloppe.
          Dissociez explicitement ou choisissez une autre enveloppe.
        </p>
      )}
      {!link.occurrence?.closed &&
        suggestions.length > 0 &&
        selectedId === null && (
          <div className="envelope-suggestions">
            <p>
              {suggestions.length > 1
                ? "Plusieurs enveloppes correspondent : choisissez celle à utiliser."
                : "Suggestion d’après la catégorie ou l’enveloppe consultée :"}
            </p>
            {suggestions.map((o) => (
              <button
                type="button"
                key={o.id}
                className="one-off-button one-off-button--secondary"
                disabled={busy || link.status !== "success"}
                onClick={() => assignment.choose(o.id)}
              >
                Choisir {o.title}
              </button>
            ))}
          </div>
        )}
      <LiveMessage message={error ?? ""} isError />
    </div>
  );
};

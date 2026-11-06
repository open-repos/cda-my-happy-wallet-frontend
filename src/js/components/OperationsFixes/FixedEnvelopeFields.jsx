import React, { useId } from "react";
import { effectiveMonthOptions } from "../../utils/envelopes";
import { monthLabel } from "../BudgetCalendar/budgetFormat";
export const FixedEnvelopeFields = ({
  values,
  onChange,
  income = false,
  editing = false,
  disabled = false,
  form,
  error,
}) => {
  const unique = useId();
  return (
    <div className="fixed-envelope-fields">
      {!income && (
        <>
          <label className="fixed-envelope-check" htmlFor={`${unique}-flag`}>
            <input
              type="checkbox"
              id={`${unique}-flag`}
              form={form}
              name="isBudgetEnvelope"
              checked={Boolean(values.isBudgetEnvelope)}
              disabled={disabled || values.periodicite !== "MENSUELLE"}
              onChange={onChange}
            />
            <span>Utiliser comme enveloppe budgétaire mensuelle</span>
          </label>
          <p>
            Rattachez vos dépenses réelles à cette charge pour suivre le
            disponible et les dépassements. Aucune seconde charge n’est créée.
          </p>
          {values.periodicite !== "MENSUELLE" && (
            <p>
              Le rapprochement est disponible uniquement pour les charges
              mensuelles, sans date d’échéance supposée pour les autres
              périodicités.
            </p>
          )}
        </>
      )}
      {editing && (
        <>
          <label htmlFor={`${unique}-month`}>
            Appliquer la modification à partir de
          </label>
          <select
            id={`${unique}-month`}
            form={form}
            name="effectiveMonth"
            value={values.effectiveMonth ?? ""}
            disabled={disabled}
            onChange={onChange}
          >
            {effectiveMonthOptions().map((month, i) => (
              <option key={month} value={month}>
                {monthLabel(month)}
                {i === 0 ? " — ce mois" : i === 1 ? " — prochain mois" : ""}
              </option>
            ))}
          </select>
          <p>
            Les mois précédant le mois choisi et les bilans clôturés sont
            conservés. Choisissez le prochain mois pour préparer votre nouveau
            budget.
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
};

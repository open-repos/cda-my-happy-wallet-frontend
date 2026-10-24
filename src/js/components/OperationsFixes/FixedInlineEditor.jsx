import React, { useRef, useState } from "react";
import {
  CHARGE_PERIODS,
  chargeBody,
  chargeInitialValues,
  chargePreview,
  validateCharge,
} from "../../utils/fixedCharges";
import {
  incomeBody,
  incomeInitialValues,
  validateIncome,
} from "../../utils/fixedIncome";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { useFormFocus } from "../../hooks/useFormFocus";
import { LiveMessage } from "../LiveMessage";

export const FixedInlineEditor = ({
  row,
  compact,
  busy,
  draft,
  onDraftChange,
  onSave,
  onClose,
}) => {
  const income = row.kind === "income";
  const [values, setValues] = useState(
    () =>
      draft ?? (income ? incomeInitialValues(row) : chargeInitialValues(row))
  );
  const [errors, setErrors] = useState({});
  const titleRef = useRef(null);
  const saving = useRef(false);
  useFormFocus(titleRef);
  const formId = `fixed-inline-${row.kind}-${row.idOperationFixe}`;
  const preview = income
    ? Object.keys(validateIncome(values)).length
      ? null
      : {
          montantPersonnel: incomeBody(values).montant,
          montantMensuelPersonnel: incomeBody(values).montant,
        }
    : chargePreview(values);
  const amount = (field) =>
    preview ? formatMoney(preview[field], values.devise) : "Indisponible";
  const change = ({ target: { name, value } }) => {
    const next = { ...values, [name]: value };
    setValues(next);
    onDraftChange(next);
    setErrors((current) => ({ ...current, [name]: null }));
  };
  const field = (name, label) => {
    const id = `${formId}-${name}`;
    const shared = {
      id,
      name,
      form: formId,
      value: values[name],
      onChange: change,
      disabled: busy,
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${id}-error` : undefined,
    };
    return (
      <div className="fixed-inline__field">
        <label htmlFor={id} className={compact ? undefined : "sr-only"}>
          {label}
        </label>
        {name === "devise" || name === "periodicite" ? (
          <select {...shared}>
            {(name === "devise"
              ? ["EUR", "USD"].map((value) => ({ value, label: value }))
              : CHARGE_PERIODS
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {name === "periodicite"
                  ? option.label.split(" — ")[0]
                  : option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...shared}
            ref={name === "titre" ? titleRef : undefined}
            maxLength={name === "titre" ? 50 : undefined}
            inputMode={name === "titre" ? undefined : "decimal"}
          />
        )}
        {errors[name] && (
          <span id={`${id}-error`} className="fixed-inline__error">
            {errors[name]}
          </span>
        )}
      </div>
    );
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving.current || busy) return;
    const next = income ? validateIncome(values) : validateCharge(values);
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`${formId}-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    saving.current = true;
    try {
      if (await onSave(income ? incomeBody(values) : chargeBody(values)))
        onClose();
    } finally {
      saving.current = false;
    }
  };
  const keyboard = (event) => {
    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      onClose();
    }
  };
  const controls = (
    <form
      id={formId}
      noValidate
      onSubmit={submit}
      className="fixed-inline__controls"
    >
      <LiveMessage
        isError
        message={
          Object.values(errors).some(Boolean)
            ? "Vérifiez les champs indiqués."
            : ""
        }
      />
      <button
        type="button"
        disabled={busy}
        onClick={onClose}
        className="one-off-button one-off-button--secondary"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={busy}
        className="one-off-button"
        aria-label={
          busy
            ? "Enregistrement…"
            : income
            ? "Enregistrer l’entrée"
            : "Enregistrer la charge"
        }
      >
        {busy ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
  const title = field(
    "titre",
    income ? "Titre de l’entrée" : "Titre de la charge"
  );
  const total = field(
    "montant",
    income ? "Montant reçu par mois" : "Montant total par échéance"
  );
  const currency = field(
    "devise",
    income ? "Devise de l’entrée" : "Devise de la charge"
  );
  const period = income ? "Mensuelle" : field("periodicite", "Périodicité");
  const share = income
    ? "Sans objet"
    : field("pourcentagePersonnel", "Ma part de la charge (%)");
  const monthly = (
    <output aria-label="Aperçu mensuel personnel">
      {amount("montantMensuelPersonnel")}
    </output>
  );
  const badge = (
    <span
      className={`fixed-operations__badge fixed-operations__badge--${row.kind}`}
    >
      {income ? "Entrée" : "Charge"}
    </span>
  );
  if (compact)
    return (
      <div className="fixed-inline" onKeyDown={keyboard}>
        <div className="fixed-operations__card-top">
          <div>
            {title}
            {badge}
          </div>
          <div className="fixed-operations__monthly">
            {monthly}
            <span>Aperçu / mois</span>
          </div>
        </div>
        <div className="fixed-inline__fields">
          {total}
          {currency}
          {!income && (
            <>
              {period}
              {share}
            </>
          )}
        </div>
        {!income && (
          <p>
            Ma part par échéance : <output>{amount("montantPersonnel")}</output>
          </p>
        )}
        {controls}
      </div>
    );
  return (
    <>
      <tr className="fixed-inline" onKeyDown={keyboard}>
        <th scope="row">
          {title}
          {badge}
        </th>
        <td>{total}</td>
        <td>{currency}</td>
        <td>{period}</td>
        <td>{share}</td>
        <td>
          <output>{income ? "Sans objet" : amount("montantPersonnel")}</output>
        </td>
        <td className="fixed-operations__monthly">
          {monthly}
          <span>Aperçu</span>
        </td>
        <td>
          <span className="fixed-inline__state">Édition</span>
        </td>
      </tr>
      <tr className="fixed-inline fixed-inline__footer" onKeyDown={keyboard}>
        <td colSpan={8}>{controls}</td>
      </tr>
    </>
  );
};

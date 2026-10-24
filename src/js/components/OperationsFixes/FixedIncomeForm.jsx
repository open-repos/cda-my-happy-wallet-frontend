import React, { useRef, useState } from "react";
import { useFormFocus } from "../../hooks/useFormFocus";
import { LiveMessage } from "../LiveMessage";

export const FixedIncomeForm = ({
  income,
  busy,
  draft,
  onDraftChange,
  onSave,
  onClose,
}) => {
  const [values, setValues] = useState(
    () =>
      draft ?? {
        titre: income?.titre ?? "",
        montant: String(income?.montant ?? ""),
        devise: income?.devise ?? "EUR",
      }
  );
  const [errors, setErrors] = useState({});
  const [attempt, setAttempt] = useState(0);
  const titleRef = useRef(null);
  const formRef = useRef(null);
  useFormFocus(titleRef);
  const change = ({ target: { name, value } }) => {
    const next = { ...values, [name]: value };
    setValues(next);
    onDraftChange?.(next);
    setErrors((current) => ({ ...current, [name]: null }));
  };
  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    const amountText = values.montant.trim();
    const amount = Number(amountText.replace(",", "."));
    if (values.titre.trim().length < 2 || values.titre.trim().length > 50)
      next.titre = "Saisissez un titre de 2 à 50 caractères.";
    if (
      !/^\d+(?:[.,]\d+)?$/.test(amountText) ||
      !Number.isFinite(amount) ||
      amount < 1
    )
      next.montant = "Saisissez un montant reçu supérieur ou égal à 1.";
    if (!["EUR", "USD"].includes(values.devise))
      next.devise = "Choisissez une devise.";
    setErrors(next);
    setAttempt((count) => count + 1);
    if (Object.keys(next).length) {
      formRef.current.elements.namedItem(Object.keys(next)[0])?.focus();
      return;
    }
    if (
      await onSave({
        titre: values.titre.trim(),
        montant: amount,
        devise: values.devise,
      })
    )
      onClose();
  };
  return (
    <section
      className="fixed-charge-form"
      aria-labelledby="fixed-income-form-title"
    >
      <h3 id="fixed-income-form-title">
        {income ? "Modifier l’entrée" : "Nouvelle entrée"}
      </h3>
      <p>
        Une entrée fixe est mensuelle. Renseignez le montant personnel que vous
        recevez.
      </p>
      <LiveMessage
        key={attempt}
        isError
        message={
          Object.keys(errors).some((key) => errors[key])
            ? "Vérifiez les champs indiqués."
            : ""
        }
      />
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend className="sr-only">Détails de l’entrée fixe</legend>
          {[
            ["titre", "Titre de l’entrée"],
            ["montant", "Montant reçu par mois"],
          ].map(([name, label]) => (
            <div className="fixed-charge-field" key={name}>
              <label htmlFor={`income-${name}`}>{label}</label>
              <input
                id={`income-${name}`}
                name={name}
                value={values[name]}
                onChange={change}
                ref={name === "titre" ? titleRef : undefined}
                inputMode={name === "montant" ? "decimal" : undefined}
                maxLength={name === "titre" ? 50 : undefined}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={
                  errors[name] ? `income-${name}-error` : undefined
                }
              />
              {errors[name] && (
                <span id={`income-${name}-error`}>{errors[name]}</span>
              )}
            </div>
          ))}
          <div className="fixed-charge-field">
            <label htmlFor="income-devise">Devise de l’entrée</label>
            <select
              id="income-devise"
              name="devise"
              value={values.devise}
              onChange={change}
              aria-invalid={Boolean(errors.devise)}
              aria-describedby={
                errors.devise ? "income-devise-error" : undefined
              }
            >
              <option>EUR</option>
              <option>USD</option>
            </select>
          </div>
          {errors.devise && (
            <span id="income-devise-error">{errors.devise}</span>
          )}
        </fieldset>
        <div className="fixed-charge-actions">
          <button
            className="one-off-button one-off-button--secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Annuler
          </button>
          <button className="one-off-button" type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer l’entrée"}
          </button>
        </div>
      </form>
    </section>
  );
};

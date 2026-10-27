import { ActionButton } from "../Actions/ActionButton";
import { FixedCategorySelect } from "./FixedCategorySelect";
import {
  fixedCategoryBody,
  validateFixedCategory,
} from "../../utils/fixedCategories";
import {
  incomeInitialValues,
  validateIncome,
  incomeBody,
} from "../../utils/fixedIncome";
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
  categories,
  categoryError,
}) => {
  const [values, setValues] = useState(
    () =>
      draft ?? {
        ...incomeInitialValues(income),
        ...(categories
          ? {
              categoryId: String(income?.categoryId ?? ""),
            }
          : {}),
      }
  );
  const [errors, setErrors] = useState({});
  const [attempt, setAttempt] = useState(0);
  const titleRef = useRef(null);
  const formRef = useRef(null);
  useFormFocus(titleRef);
  const change = ({ target: { name, value } }) => {
    const next = {
      ...values,
      [name]: value,
    };
    setValues(next);
    onDraftChange?.(next);
    setErrors((current) => ({
      ...current,
      [name]: null,
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    const next = validateIncome(values);
    const categoryFailure = validateFixedCategory(values, categories, "income");
    if (categoryFailure) next.categoryId = categoryFailure;
    setErrors(next);
    setAttempt((count) => count + 1);
    if (Object.keys(next).length) {
      formRef.current.elements.namedItem(Object.keys(next)[0])?.focus();
      return;
    }
    if (
      await onSave({
        ...incomeBody(values),
        ...fixedCategoryBody(values),
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
          {categories && (
            <FixedCategorySelect
              id="income-category"
              kind="income"
              value={values.categoryId ?? ""}
              onChange={change}
              source={categories}
              currentCategory={income?.category}
              busy={busy}
              error={errors.categoryId || categoryError}
            />
          )}
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
          <ActionButton
            action="cancel"
            className="one-off-button one-off-button--secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Annuler
          </ActionButton>
          <ActionButton
            action="save"
            className="one-off-button"
            type="submit"
            disabled={busy}
            busy={busy}
          >
            {busy ? "Enregistrement…" : "Enregistrer l’entrée"}
          </ActionButton>
        </div>
      </form>
    </section>
  );
};

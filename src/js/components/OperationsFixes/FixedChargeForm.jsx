import { ActionButton } from "../Actions/ActionButton";
import { FixedCategorySelect } from "./FixedCategorySelect";
import { FixedEnvelopeFields } from "./FixedEnvelopeFields";
import {
  fixedCategoryBody,
  validateFixedCategory,
} from "../../utils/fixedCategories";
import React, { useRef, useState } from "react";
import {
  CHARGE_PERIODS,
  chargeInitialValues,
  chargePreview,
  chargeBody,
  validateCharge,
} from "../../utils/fixedCharges";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";
import { useFormFocus } from "../../hooks/useFormFocus";
export const FixedChargeForm = ({
  charge,
  busy,
  onSave,
  onClose,
  categories,
  categoryError,
  draft,
  onDraftChange,
}) => {
  const [values, setValues] = useState(
    () =>
      draft ?? {
        ...chargeInitialValues(charge),
        ...(categories
          ? {
              categoryId: String(charge?.categoryId ?? ""),
            }
          : {}),
      }
  );
  const [errors, setErrors] = useState({});
  const [attempt, setAttempt] = useState(0);
  const titleRef = useRef(null);
  const formRef = useRef(null);
  useFormFocus(titleRef);
  const preview = chargePreview(values);
  const change = (event) => {
    const { name, value, type, checked } = event.target;
    const next = {
      ...values,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "periodicite" && value !== "MENSUELLE"
        ? { isBudgetEnvelope: false }
        : {}),
    };
    setValues(next);
    onDraftChange?.(next);
    setErrors((current) => {
      const next = {
        ...current,
      };
      delete next[name];
      return next;
    });
  };
  const field = (name, label, extra = {}) => (
    <div className="fixed-charge-field">
      <label htmlFor={`charge-${name}`}>{label}</label>
      <input
        id={`charge-${name}`}
        name={name}
        value={values[name]}
        onChange={change}
        ref={name === "titre" ? titleRef : undefined}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `charge-${name}-error` : undefined}
        {...extra}
      />
      {errors[name] && <span id={`charge-${name}-error`}>{errors[name]}</span>}
    </div>
  );
  const submit = async (event) => {
    event.preventDefault();
    const next = validateCharge(values);
    const categoryFailure = validateFixedCategory(values, categories, "charge");
    if (categoryFailure) next.categoryId = categoryFailure;
    setErrors(next);
    setAttempt((count) => count + 1);
    if (Object.keys(next).length) {
      formRef.current?.elements.namedItem(Object.keys(next)[0])?.focus();
      return;
    }
    if (
      await onSave({
        ...chargeBody(values),
        ...fixedCategoryBody(values),
      })
    )
      onClose();
  };
  return (
    <section className="fixed-charge-form" aria-labelledby="charge-form-title">
      <h3 id="charge-form-title">
        {charge ? "Modifier la charge" : "Nouvelle charge"}
      </h3>
      <LiveMessage
        key={attempt}
        isError
        message={
          Object.keys(errors).length ? "Vérifiez les champs indiqués." : ""
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
          <legend className="sr-only">Détails de la charge</legend>
          {field("titre", "Titre de la charge", {
            maxLength: 50,
          })}
          {categories && (
            <FixedCategorySelect
              id="charge-category"
              kind="charge"
              value={values.categoryId ?? ""}
              onChange={change}
              source={categories}
              currentCategory={charge?.category}
              busy={busy}
              error={errors.categoryId || categoryError}
            />
          )}
          {field("montant", "Montant total par échéance", {
            inputMode: "decimal",
          })}
          <div className="fixed-charge-field">
            <label htmlFor="charge-devise">Devise de la charge</label>
            <select
              id="charge-devise"
              name="devise"
              value={values.devise}
              onChange={change}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="fixed-charge-field">
            <label htmlFor="charge-periodicite">Périodicité</label>
            <select
              id="charge-periodicite"
              name="periodicite"
              value={values.periodicite}
              onChange={change}
            >
              {CHARGE_PERIODS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend>Répartition de la charge</legend>
            {field("pourcentagePersonnel", "Ma part de la charge (%)", {
              inputMode: "decimal",
            })}
            <p>
              100 % si vous payez tout, 50 % pour un partage égal à deux. Vous
              pouvez choisir un autre pourcentage, y compris 0 %.
            </p>
          </fieldset>
          <FixedEnvelopeFields
            values={values}
            onChange={change}
            editing={Boolean(charge)}
            disabled={busy}
            error={errors.isBudgetEnvelope || errors.effectiveMonth}
          />
        </fieldset>
        <section
          aria-label="Aperçu de la charge"
          className="fixed-charge-preview"
        >
          <LiveMessage
            visible={false}
            message={
              preview
                ? `Ma part par échéance : ${formatMoney(
                    preview.montantPersonnel,
                    values.devise
                  )}. Ma part mensuelle : ${formatMoney(
                    preview.montantMensuelPersonnel,
                    values.devise
                  )}.`
                : "Renseignez le montant et votre pourcentage pour voir l’aperçu."
            }
          />
          {preview ? (
            <dl>
              <dt>Total par échéance</dt>
              <dd>{formatMoney(chargeBody(values).montant, values.devise)}</dd>
              <dt>Ma part par échéance</dt>
              <dd>{formatMoney(preview.montantPersonnel, values.devise)}</dd>
              <dt>Ma part mensuelle</dt>
              <dd>
                {formatMoney(preview.montantMensuelPersonnel, values.devise)}
              </dd>
            </dl>
          ) : (
            <p>
              Renseignez le montant et votre pourcentage pour voir l’aperçu.
            </p>
          )}
          <p>
            Un coût mensuel moyen pour votre budget, sans constitution de
            réserve.
          </p>
        </section>
        <div className="fixed-charge-actions">
          <ActionButton
            action="cancel"
            className="one-off-button one-off-button--secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
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
            {busy ? "Enregistrement…" : "Enregistrer la charge"}
          </ActionButton>
        </div>
      </form>
    </section>
  );
};

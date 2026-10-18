import { useFormFocus } from "../../hooks/useFormFocus";
import React, { useEffect, useRef, useState } from "react";

const emptyGoal = {
  title: "",
  targetAmount: "",
  savedAmount: "0",
  monthlyContribution: "0",
  targetDate: "",
};

const AMOUNT = /^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

const isDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
};

/** Règles du contrat backend `docs/financial-goals.md`. */
export const validateGoal = (input) => {
  const goal = {
    ...input,
    targetAmount: decimal(input.targetAmount),
    savedAmount: decimal(input.savedAmount),
    monthlyContribution: decimal(input.monthlyContribution),
  };
  const errors = {};
  const title = goal.title.trim();
  if (title.length < 2 || title.length > 50)
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  if (!AMOUNT.test(goal.targetAmount) || Number(goal.targetAmount) <= 0)
    errors.targetAmount =
      "Saisissez un montant cible positif, par exemple 1200 ou 1200,50.";
  if (!AMOUNT.test(goal.savedAmount))
    errors.savedAmount =
      "Saisissez un montant positif ou nul, par exemple 0 ou 150,50.";
  if (!AMOUNT.test(goal.monthlyContribution))
    errors.monthlyContribution =
      "Saisissez un versement positif ou nul, par exemple 0 ou 75,50.";
  if (goal.targetDate && !isDate(goal.targetDate))
    errors.targetDate = "Choisissez une date valide.";
  return errors;
};

/** Accepte la virgule décimale saisie sur un clavier français. */
const decimal = (value) => value.trim().replace(",", ".");
const normalizeAmount = (value) => Number(decimal(value)).toFixed(2);

const fields = [
  { name: "targetAmount", label: "Montant cible" },
  { name: "savedAmount", label: "Déjà épargné" },
  { name: "monthlyContribution", label: "Versement mensuel prévu" },
];

export const FinancialGoalForm = ({
  goal,
  isSaving,
  onCancel,
  onDelete,
  onSave,
}) => {
  const [values, setValues] = useState(() =>
    goal
      ? {
          title: goal.title,
          targetAmount: goal.targetAmount,
          savedAmount: goal.savedAmount,
          monthlyContribution: goal.monthlyContribution,
          targetDate: goal.targetDate ?? "",
        }
      : emptyGoal
  );
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef(null);
  useFormFocus(titleRef);
  useEffect(() => {
    const close = (keyboardEvent) =>
      keyboardEvent.key === "Escape" && !isSaving && onCancel();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [isSaving, onCancel]);

  const update = ({ target: { name, value } }) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    const nextErrors = validateGoal(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSave({
      title: values.title.trim(),
      targetAmount: normalizeAmount(values.targetAmount),
      savedAmount: normalizeAmount(values.savedAmount),
      monthlyContribution: normalizeAmount(values.monthlyContribution),
      currency: "EUR",
      targetDate: values.targetDate || null,
    });
  };
  const field = (name) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `goal-${name}-error` : undefined,
  });

  return (
    <section
      className="monthly-event-form-panel"
      aria-labelledby="goal-form-title"
    >
      <div className="monthly-event-form-panel__header">
        <h3 id="goal-form-title">
          {goal ? "Modifier l’objectif" : "Ajouter un objectif"}
        </h3>
        <button
          type="button"
          className="monthly-event-icon-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Fermer le formulaire de l’objectif"
        >
          ×
        </button>
      </div>
      <form className="monthly-event-form" onSubmit={submit} noValidate>
        <label htmlFor="goal-title">
          Titre
          <input
            id="goal-title"
            ref={titleRef}
            name="title"
            value={values.title}
            onChange={update}
            maxLength={50}
            {...field("title")}
          />
          {errors.title && <span id="goal-title-error">{errors.title}</span>}
        </label>
        {fields.map(({ name, label }) => (
          <label key={name} htmlFor={`goal-${name}`}>
            {label}
            <span className="monthly-event-form__amount">
              <input
                id={`goal-${name}`}
                name={name}
                inputMode="decimal"
                value={values[name]}
                onChange={update}
                placeholder="0.00"
                {...field(name)}
              />
              <span>EUR</span>
            </span>
            {errors[name] && (
              <span id={`goal-${name}-error`}>{errors[name]}</span>
            )}
          </label>
        ))}
        <label htmlFor="goal-targetDate">
          Date souhaitée <span className="sr-only">facultative</span>
          <input
            id="goal-targetDate"
            type="date"
            name="targetDate"
            value={values.targetDate}
            onChange={update}
            {...field("targetDate")}
          />
          {errors.targetDate && (
            <span id="goal-targetDate-error">{errors.targetDate}</span>
          )}
        </label>
        <div className="monthly-event-form__actions">
          {goal && !confirmDelete && (
            <button
              type="button"
              className="monthly-event-button monthly-event-button--danger"
              onClick={() => setConfirmDelete(true)}
              disabled={isSaving}
            >
              Supprimer
            </button>
          )}
          {goal && confirmDelete && (
            <div className="monthly-event-delete-confirmation" role="alert">
              <span>Supprimer cet objectif ?</span>
              <button type="button" onClick={onDelete} disabled={isSaving}>
                Oui, supprimer
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={isSaving}
              >
                Annuler
              </button>
            </div>
          )}
          <button
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="monthly-event-button"
            disabled={isSaving}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
};

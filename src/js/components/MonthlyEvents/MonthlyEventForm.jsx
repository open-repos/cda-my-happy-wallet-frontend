import { FormActions } from "../Actions/FormActions";
import { DeleteConfirmation } from "../Actions/DeleteConfirmation";
import { ActionButton } from "../Actions/ActionButton";
import { useFormFocus } from "../../hooks/useFormFocus";
import React, { useEffect, useId, useRef, useState } from "react";
import {
  EVENT_RECURRENCE_OPTIONS,
  isEventRecurrence,
  isRepeatingEvent,
} from "../../utils/eventRecurrences";
const emptyEvent = {
  title: "",
  amount: "",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: "",
  recurrence: "AUCUNE",
  endDate: "",
};
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
const validate = (event) => {
  const errors = {};
  if (event.title.trim().length < 2 || event.title.trim().length > 50)
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  if (
    !/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(event.amount) ||
    Number(event.amount) <= 0
  )
    errors.amount = "Saisissez un montant positif avec deux décimales maximum.";
  if (!isDate(event.startDate))
    errors.startDate = "Choisissez une date valide.";
  if (!isEventRecurrence(event.recurrence))
    errors.recurrence = "Choisissez une répétition valide.";
  if (
    isRepeatingEvent(event.recurrence) &&
    event.endDate &&
    (!isDate(event.endDate) || event.endDate < event.startDate)
  )
    errors.endDate =
      "Choisissez une date de fin valide, au plus tôt à la date de début.";
  return errors;
};
export const MonthlyEventForm = ({
  event,
  initialDate = "",
  isSaving,
  onCancel,
  onDelete,
  onSave,
  formTitle,
  minStartDate,
}) => {
  const [values, setValues] = useState(() =>
    event
      ? {
          ...event,
          endDate: event.endDate || "",
        }
      : {
          ...emptyEvent,
          startDate: initialDate,
        }
  );
  const formId = useId();
  const controlId = (name) => `monthly-event-${formId}-${name}`;
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef(null);
  const deleteTrigger = useRef(null);
  const saving = useRef(false);
  useFormFocus(titleRef);
  useEffect(() => {
    const close = (keyboardEvent) =>
      keyboardEvent.key === "Escape" && !isSaving && onCancel();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [isSaving, onCancel]);
  const update = ({ target: { name, value } }) => {
    setValues((current) => ({
      ...current,
      [name]: value,
      ...(name === "recurrence" && value === "AUCUNE"
        ? {
            endDate: "",
          }
        : {}),
    }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === "recurrence" && value === "AUCUNE"
        ? {
            endDate: undefined,
          }
        : {}),
    }));
  };
  const submit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (saving.current || isSaving) return;
    const nextErrors = validate(values);
    if (minStartDate && values.startDate && values.startDate < minStartDate)
      nextErrors.startDate =
        "Un élément potentiel doit commencer dans le mois courant ou un mois futur.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      submitEvent.currentTarget.elements
        .namedItem(Object.keys(nextErrors)[0])
        ?.focus();
      return;
    }
    saving.current = true;
    try {
      await onSave({
        title: values.title.trim(),
        amount: values.amount,
        currency: values.currency,
        kind: values.kind,
        startDate: values.startDate,
        recurrence: values.recurrence,
        endDate:
          isRepeatingEvent(values.recurrence) && values.endDate
            ? values.endDate
            : null,
      });
    } finally {
      saving.current = false;
    }
  };
  const field = (name) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? controlId(`${name}-error`) : undefined,
  });
  return (
    <section
      className="monthly-event-form-panel"
      aria-labelledby={controlId("form-title")}
    >
      <div className="monthly-event-form-panel__header">
        <h2 id={controlId("form-title")}>
          {formTitle ||
            (event ? "Modifier l’événement" : "Ajouter un événement")}
        </h2>
        <button
          type="button"
          className="monthly-event-icon-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Fermer le formulaire"
        >
          ×
        </button>
      </div>
      <form className="monthly-event-form" onSubmit={submit} noValidate>
        <label htmlFor={controlId("title")}>
          Titre
          <input
            id={controlId("title")}
            ref={titleRef}
            name="title"
            value={values.title}
            onChange={update}
            maxLength={50}
            {...field("title")}
          />
          {errors.title && (
            <span id={controlId("title-error")}>{errors.title}</span>
          )}
        </label>
        <label htmlFor={controlId("amount")}>
          Montant
          <span className="monthly-event-form__amount">
            <input
              id={controlId("amount")}
              name="amount"
              inputMode="decimal"
              value={values.amount}
              onChange={update}
              placeholder="0.00"
              {...field("amount")}
            />
            <span>EUR</span>
          </span>
          {errors.amount && (
            <span id={controlId("amount-error")}>{errors.amount}</span>
          )}
        </label>
        <label htmlFor={controlId("start-date")}>
          Date de début
          <input
            id={controlId("start-date")}
            type="date"
            min={minStartDate}
            name="startDate"
            value={values.startDate}
            onChange={update}
            {...field("startDate")}
          />
          {errors.startDate && (
            <span id={controlId("startDate-error")}>{errors.startDate}</span>
          )}
        </label>
        <label htmlFor={controlId("recurrence")}>
          Récurrence
          <select
            id={controlId("recurrence")}
            name="recurrence"
            value={values.recurrence}
            onChange={update}
            {...field("recurrence")}
          >
            {EVENT_RECURRENCE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.recurrence && (
            <span id={controlId("recurrence-error")}>{errors.recurrence}</span>
          )}
        </label>
        {isRepeatingEvent(values.recurrence) && (
          <label htmlFor={controlId("end-date")}>
            Date de fin <span>(facultative)</span>
            <input
              id={controlId("end-date")}
              type="date"
              name="endDate"
              value={values.endDate}
              min={values.startDate || undefined}
              onChange={update}
              {...field("endDate")}
            />
            {errors.endDate && (
              <span id={controlId("endDate-error")}>{errors.endDate}</span>
            )}
          </label>
        )}
        <fieldset>
          <legend>Impact sur le budget</legend>
          <label htmlFor={controlId("expense")}>
            <input
              id={controlId("expense")}
              type="radio"
              name="kind"
              value="DEPENSE"
              checked={values.kind === "DEPENSE"}
              onChange={update}
            />
            Dépense
          </label>
          <label htmlFor={controlId("income")}>
            <input
              id={controlId("income")}
              type="radio"
              name="kind"
              value="ENTREE"
              checked={values.kind === "ENTREE"}
              onChange={update}
            />
            Entrée
          </label>
        </fieldset>
        <FormActions
          className="monthly-event-form__actions"
          destructive={
            <>
              {event && !confirmDelete && (
                <ActionButton
                  action="delete"
                  ref={deleteTrigger}
                  type="button"
                  className="monthly-event-button monthly-event-button--danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isSaving}
                >
                  Supprimer
                </ActionButton>
              )}
              {event && confirmDelete && (
                <DeleteConfirmation
                  title={event.title}
                  busy={isSaving}
                  onConfirm={onDelete}
                  onCancel={() => setConfirmDelete(false)}
                  returnFocusRef={deleteTrigger}
                  className="monthly-event-delete-confirmation"
                />
              )}
            </>
          }
        >
          <ActionButton
            action="cancel"
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Annuler
          </ActionButton>
          <ActionButton
            action="save"
            type="submit"
            className="monthly-event-button"
            disabled={isSaving}
            busy={isSaving}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        </FormActions>
      </form>
    </section>
  );
};

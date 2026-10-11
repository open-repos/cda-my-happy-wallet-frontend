import React, { useEffect, useRef, useState } from "react";
import { formatMoney, longDate } from "./budgetFormat";

const amountPattern = /^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

/**
 * Convertit une occurrence en opération réelle. Le sens reste celui de
 * l'événement; titre, montant et date peuvent refléter ce qui a été constaté.
 */
export const RealizeOccurrenceForm = ({
  occurrence,
  categories,
  defaultDate,
  isSaving,
  onCancel,
  onSave,
}) => {
  const [values, setValues] = useState({
    title: occurrence.title,
    amount: occurrence.amount,
    operationDate: defaultDate,
    categoryId: categories[0] ? `${categories[0].id}` : "",
  });
  const [errors, setErrors] = useState({});
  const titleRef = useRef(null);
  useEffect(() => titleRef.current?.focus(), []);

  const update = ({ target }) => {
    setValues((current) => ({ ...current, [target.name]: target.value }));
    setErrors((current) => ({ ...current, [target.name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const title = values.title.trim();
    if (title.length < 2 || title.length > 50)
      nextErrors.title = "Le titre doit contenir entre 2 et 50 caractères.";
    if (!amountPattern.test(values.amount) || Number(values.amount) <= 0)
      nextErrors.amount = "Saisissez un montant positif.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.operationDate))
      nextErrors.operationDate = "Choisissez une date valide.";
    if (!categories.some(({ id }) => `${id}` === values.categoryId))
      nextErrors.categoryId = "Choisissez une catégorie.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    await onSave({
      categoryId: Number(values.categoryId),
      title,
      amount: values.amount,
      operationDate: values.operationDate,
    });
  };

  const field = (name) => ({
    name,
    value: values[name],
    onChange: update,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `realize-${name}-error` : undefined,
  });

  return (
    <section
      className="monthly-event-form-panel"
      aria-labelledby="realize-title"
    >
      <div className="monthly-event-form-panel__header">
        <h2 id="realize-title">Convertir en opération</h2>
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
      <p className="budget-help">
        {occurrence.kind === "ENTREE" ? "Entrée" : "Dépense"} prévue le{" "}
        {longDate(occurrence.occurrenceDate)} :{" "}
        {formatMoney(occurrence.amount, occurrence.currency)}. Ajustez les
        valeurs réellement constatées.
      </p>
      <form className="monthly-event-form" onSubmit={submit} noValidate>
        <label>
          Titre
          <input ref={titleRef} {...field("title")} maxLength={50} />
          {errors.title && <span id="realize-title-error">{errors.title}</span>}
        </label>
        <label>
          Montant ({occurrence.currency})
          <input {...field("amount")} inputMode="decimal" />
          {errors.amount && (
            <span id="realize-amount-error">{errors.amount}</span>
          )}
        </label>
        <label>
          Date de l’opération
          <input type="date" {...field("operationDate")} />
          {errors.operationDate && (
            <span id="realize-operationDate-error">{errors.operationDate}</span>
          )}
        </label>
        <label>
          Catégorie
          <select {...field("categoryId")}>
            {categories.length === 0 && (
              <option value="">Aucune catégorie</option>
            )}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span id="realize-categoryId-error">{errors.categoryId}</span>
          )}
        </label>
        <div className="monthly-event-form__actions">
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
            Enregistrer l’opération
          </button>
        </div>
      </form>
    </section>
  );
};

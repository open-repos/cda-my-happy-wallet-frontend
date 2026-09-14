import React, { useEffect, useRef, useState } from "react";

const emptyOperation = {
  title: "",
  amount: "",
  currency: "EUR",
  kind: "DEPENSE",
  operationDate: "",
  categoryId: "",
};

const isCalendarDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
};

const validate = (operation, categoryIds) => {
  const errors = {};
  const title = operation.title.trim();
  if (title.length < 2 || title.length > 50)
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  if (
    !/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(operation.amount) ||
    Number(operation.amount) <= 0
  )
    errors.amount = "Saisissez un montant positif avec deux décimales maximum.";
  if (!isCalendarDate(operation.operationDate))
    errors.operationDate = "Choisissez une date valide.";
  if (!categoryIds.has(Number(operation.categoryId)))
    errors.categoryId = "Choisissez une catégorie.";
  return errors;
};

export const OneOffOperationForm = ({
  categories,
  operation,
  isSaving,
  onCancel,
  onDelete,
  onSave,
}) => {
  const [values, setValues] = useState(() =>
    operation
      ? {
          ...operation,
          kind: operation.type,
          categoryId: `${operation.categoryId}`,
        }
      : emptyOperation
  );
  const [errors, setErrors] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isSaving) onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onCancel]);

  const update = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(
      values,
      new Set(categories.map(({ id }) => id))
    );
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    await onSave({
      title: values.title.trim(),
      amount: values.amount,
      currency: "EUR",
      kind: values.kind,
      operationDate: values.operationDate,
      categoryId: Number(values.categoryId),
    });
  };

  const describedBy = (field) => (errors[field] ? `${field}-error` : undefined);

  return (
    <section
      className="one-off-form-panel"
      aria-labelledby="operation-form-title"
    >
      <div className="one-off-form-panel__header">
        <h2 id="operation-form-title">
          {operation ? "Modifier l’opération" : "Ajouter une opération"}
        </h2>
        <button
          type="button"
          className="one-off-icon-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Fermer le formulaire"
        >
          ×
        </button>
      </div>
      <form className="one-off-form" onSubmit={submit} noValidate>
        <label>
          Titre
          <input
            ref={titleRef}
            name="title"
            value={values.title}
            onChange={update}
            maxLength={50}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy("title")}
          />
          {errors.title && <span id="title-error">{errors.title}</span>}
        </label>
        <label>
          Montant
          <span className="one-off-form__amount">
            <input
              name="amount"
              inputMode="decimal"
              value={values.amount}
              onChange={update}
              placeholder="0.00"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={describedBy("amount")}
            />
            <span aria-hidden="true">EUR</span>
          </span>
          {errors.amount && <span id="amount-error">{errors.amount}</span>}
        </label>
        <label>
          Date
          <input
            type="date"
            name="operationDate"
            value={values.operationDate}
            onChange={update}
            aria-invalid={Boolean(errors.operationDate)}
            aria-describedby={describedBy("operationDate")}
          />
          {errors.operationDate && (
            <span id="operationDate-error">{errors.operationDate}</span>
          )}
        </label>
        <label>
          Catégorie
          <select
            name="categoryId"
            value={values.categoryId}
            onChange={update}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={describedBy("categoryId")}
          >
            <option value="">Choisir une catégorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span id="categoryId-error">{errors.categoryId}</span>
          )}
        </label>
        <fieldset>
          <legend>Type d’opération</legend>
          <label>
            <input
              type="radio"
              name="kind"
              value="DEPENSE"
              checked={values.kind === "DEPENSE"}
              onChange={update}
            />
            Dépense
          </label>
          <label>
            <input
              type="radio"
              name="kind"
              value="ENTREE"
              checked={values.kind === "ENTREE"}
              onChange={update}
            />
            Entrée
          </label>
        </fieldset>
        <div className="one-off-form__actions">
          {operation && !isConfirmingDelete && (
            <button
              type="button"
              className="one-off-button one-off-button--danger"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isSaving}
            >
              Supprimer
            </button>
          )}
          {operation && isConfirmingDelete && (
            <div className="one-off-delete-confirmation" role="alert">
              <span>Confirmer la suppression ?</span>
              <button type="button" onClick={onDelete} disabled={isSaving}>
                Oui, supprimer
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isSaving}
              >
                Annuler
              </button>
            </div>
          )}
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Annuler
          </button>
          <button type="submit" className="one-off-button" disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
};

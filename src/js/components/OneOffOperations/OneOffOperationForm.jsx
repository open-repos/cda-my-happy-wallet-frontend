import { FormHeader } from "../Forms/FormHeader";
import { FormActions } from "../Actions/FormActions";
import { DeleteConfirmation } from "../Actions/DeleteConfirmation";
import { ActionButton } from "../Actions/ActionButton";
import { CategorySelect } from "../Categories/CategorySelect";
import { validateOperation } from "../../utils/oneOffOperationForm";
import { useFormFocus } from "../../hooks/useFormFocus";
import { useEnvelopeAssignment } from "../../hooks/useEnvelopeAssignment";
import { EnvelopeAssignment } from "../Envelopes/EnvelopeAssignment";
import React, { useEffect, useRef, useState } from "react";
const emptyOperation = {
  title: "",
  amount: "",
  currency: "EUR",
  kind: "DEPENSE",
  operationDate: "",
  categoryId: "",
};
export const OneOffOperationForm = ({
  categories,
  operation,
  initialDate = "",
  initialKind = "DEPENSE",
  initialCurrency = "EUR",
  initialCategoryId = "",
  suggestedEnvelopeId = null,
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
      : {
          ...emptyOperation,
          kind: initialKind,
          operationDate: initialDate,
          currency: initialCurrency,
          categoryId: String(initialCategoryId),
        }
  );
  const [errors, setErrors] = useState({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const titleRef = useRef(null);
  const deleteTrigger = useRef(null);
  const saving = useRef(false);
  const assignment = useEnvelopeAssignment(
    operation,
    values,
    suggestedEnvelopeId
  );
  useFormFocus(titleRef);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isSaving) onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isSaving, onCancel]);
  const update = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({
      ...current,
      [name]: value,
    }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (saving.current || isSaving) return;
    const validationErrors = validateOperation(
      values,
      new Set(categories.map(({ id }) => id))
    );
    const reconciliationError = assignment.problem();
    if (reconciliationError)
      validationErrors.reconciliation = reconciliationError;
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saving.current = true;
    try {
      await onSave({
        title: values.title.trim(),
        amount: values.amount,
        currency: values.currency,
        kind: values.kind,
        operationDate: values.operationDate,
        categoryId: Number(values.categoryId),
        ...assignment.body(),
      });
    } finally {
      saving.current = false;
    }
  };
  const describedBy = (field) => (errors[field] ? `${field}-error` : undefined);
  return (
    <section
      className="one-off-form-panel"
      aria-labelledby="operation-form-title"
    >
      <FormHeader id="operation-form-title" busy={isSaving} onClose={onCancel}>
        {operation ? "Modifier l’opération" : "Ajouter une opération"}
      </FormHeader>
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
            <span aria-hidden="true">{values.currency}</span>
          </span>
          {errors.amount && <span id="amount-error">{errors.amount}</span>}
        </label>
        <label>
          Devise
          <select
            name="currency"
            value={values.currency}
            onChange={update}
            disabled={isSaving}
          >
            <option>EUR</option>
            <option>USD</option>
          </select>
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
          <CategorySelect
            categories={categories}
            name="categoryId"
            value={values.categoryId}
            onChange={update}
            disabled={isSaving}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={describedBy("categoryId")}
          />
          {errors.categoryId && (
            <span role="alert" id="categoryId-error">
              {errors.categoryId}
            </span>
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
        <EnvelopeAssignment
          assignment={assignment}
          busy={isSaving}
          error={errors.reconciliation}
        />
        <FormActions
          className="one-off-form__actions"
          destructive={
            <>
              {operation && onDelete && !isConfirmingDelete && (
                <ActionButton
                  action="delete"
                  ref={deleteTrigger}
                  type="button"
                  className="one-off-button one-off-button--danger"
                  onClick={() => setIsConfirmingDelete(true)}
                  disabled={
                    isSaving || Boolean(assignment.link.occurrence?.closed)
                  }
                >
                  Supprimer
                </ActionButton>
              )}
              {operation && onDelete && isConfirmingDelete && (
                <DeleteConfirmation
                  title={operation.title}
                  busy={isSaving}
                  onConfirm={onDelete}
                  onCancel={() => setIsConfirmingDelete(false)}
                  returnFocusRef={deleteTrigger}
                  className="one-off-delete-confirmation"
                />
              )}
            </>
          }
        >
          <ActionButton
            action="cancel"
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Annuler
          </ActionButton>
          <ActionButton
            action="save"
            type="submit"
            className="one-off-button"
            disabled={isSaving || Boolean(assignment.link.occurrence?.closed)}
            busy={isSaving}
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </ActionButton>
        </FormActions>
      </form>
    </section>
  );
};

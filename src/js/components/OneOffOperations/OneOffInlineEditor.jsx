import { CategorySelect } from "../Categories/CategorySelect";
import React, { useRef, useState } from "react";
import { useFormFocus } from "../../hooks/useFormFocus";
import { validateOperation } from "../../utils/oneOffOperationForm";
export const OneOffInlineEditor = ({
  operation,
  categories,
  busy,
  onSave,
  onCancel,
  mutationError,
}) => {
  const [values, setValues] = useState(() => ({
      ...operation,
      kind: operation.type,
      categoryId: String(operation.categoryId),
    })),
    [errors, setErrors] = useState({});
  const titleRef = useRef(null),
    saving = useRef(false);
  useFormFocus(titleRef);
  const formId = `one-off-inline-${operation.id}`;
  const change = ({ target: { name, value } }) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((v) => ({ ...v, [name]: null }));
  };
  const field = (name, label, type = "text") => {
    const props = {
      id: `${formId}-${name}`,
      name,
      form: formId,
      value: values[name],
      onChange: change,
      disabled: busy,
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${formId}-${name}-error` : undefined,
    };
    return (
      <label htmlFor={props.id}>
        {label}
        {name === "categoryId" ? (
          <CategorySelect {...props} categories={categories} />
        ) : name === "kind" ? (
          <select {...props}>
            <option value="DEPENSE">Dépense</option>
            <option value="ENTREE">Entrée</option>
          </select>
        ) : (
          <input
            {...props}
            type={type}
            ref={name === "title" ? titleRef : undefined}
            maxLength={name === "title" ? 50 : undefined}
            inputMode={name === "amount" ? "decimal" : undefined}
          />
        )}{" "}
        {errors[name] && (
          <span className="compact-inline-error" id={`${formId}-${name}-error`}>
            {errors[name]}
          </span>
        )}
      </label>
    );
  };
  const submit = async (e) => {
    e.preventDefault();
    if (saving.current || busy) return;
    const next = validateOperation(
      values,
      new Set(categories.map((c) => c.id))
    );
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`${formId}-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    saving.current = true;
    try {
      await onSave({
        title: values.title.trim(),
        amount: values.amount,
        currency: operation.currency,
        kind: values.kind,
        operationDate: values.operationDate,
        categoryId: Number(values.categoryId),
      });
    } finally {
      saving.current = false;
    }
  };
  return (
    <tr
      className="compact-money-table__editor"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <td>{field("operationDate", "Date", "date")}</td>
      <th scope="row">{field("title", "Titre")}</th>
      <td>{field("categoryId", "Catégorie")}</td>
      <td>{field("kind", "Type")}</td>
      <td>{field("amount", `Montant (${operation.currency})`)}</td>
      <td>
        <form
          id={formId}
          className="compact-inline-controls"
          noValidate
          onSubmit={submit}
        >
          {mutationError && (
            <span className="compact-inline-error" role="alert">
              {mutationError}
            </span>
          )}
          <button type="submit" className="one-off-button" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Annuler
          </button>
        </form>
      </td>
    </tr>
  );
};

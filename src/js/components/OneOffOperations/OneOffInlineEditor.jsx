import { CategorySelect } from "../Categories/CategorySelect";
import React, { useRef, useState } from "react";
import { useFormFocus } from "../../hooks/useFormFocus";
import { validateOperation } from "../../utils/oneOffOperationForm";
import { normalizeDecimal } from "../../utils/decimalInput";
import { useEnvelopeAssignment } from "../../hooks/useEnvelopeAssignment";
import { EnvelopeAssignment } from "../Envelopes/EnvelopeAssignment";
import {
  InlineActions,
  InlineCell,
  InlineEditorRow,
} from "../CompactOperations/InlineEditing";

const SECONDARY = new Set(["currency", "reconciliation"]);
/** Cell-sized messages; the full message stays in the description. */
const SHORT = {
  operationDate: "Date invalide",
  title: "2 à 50 caractères",
  categoryId: "Catégorie requise",
  kind: "Type invalide",
  amount: "Invalide, ex. 12,50",
};

/** Operation draft in the shape of the API resource, for the full form. */
const asOperation = (operation, values) => ({
  ...operation,
  title: values.title,
  amount: values.amount,
  currency: values.currency,
  type: values.kind,
  operationDate: values.operationDate,
  categoryId: values.categoryId === "" ? "" : Number(values.categoryId),
});

export const OneOffInlineEditor = ({
  operation,
  categories,
  busy,
  onSave,
  onCancel,
  onMoreOptions,
  mutationError,
}) => {
  const [values, setValues] = useState(() => ({
      ...operation,
      kind: operation.type,
      categoryId: String(operation.categoryId),
    })),
    [errors, setErrors] = useState({}),
    [revealed, setRevealed] = useState(false);
  const titleRef = useRef(null),
    saving = useRef(false);
  useFormFocus(titleRef);
  const formId = `one-off-inline-${operation.id}`;
  const assignment = useEnvelopeAssignment(operation, values);
  const change = ({ target: { name, value } }) => {
    setValues((v) => ({
      ...v,
      [name]: value,
    }));
    setErrors((v) => ({
      ...v,
      [name]: null,
    }));
  };
  const cell = (name, label, control, className) => (
    <InlineCell
      id={`${formId}-${name}`}
      label={label}
      error={errors[name]}
      shortError={SHORT[name]}
      className={className}
    >
      {(aria) =>
        control({
          ...aria,
          name,
          form: formId,
          value: values[name],
          onChange: change,
          disabled: busy,
        })
      }
    </InlineCell>
  );
  const select = (options) => (props) =>
    (
      <select {...props}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    );
  const submit = async (e) => {
    e.preventDefault();
    if (saving.current || busy) return;
    const next = validateOperation(
      values,
      new Set(categories.map((c) => c.id))
    );
    const reconciliationError = assignment.problem();
    if (reconciliationError) next.reconciliation = reconciliationError;
    setErrors(next);
    const failed = Object.keys(next);
    if (failed.length) {
      // Unfold the failing secondary field next to its error: the full form
      // would only show it after another save.
      if (failed.some((name) => SECONDARY.has(name))) setRevealed(true);
      requestAnimationFrame(() =>
        document.getElementById(`${formId}-${failed[0]}`)?.focus()
      );
      return;
    }
    saving.current = true;
    try {
      await onSave({
        title: values.title.trim(),
        amount: normalizeDecimal(values.amount),
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
  return (
    <InlineEditorRow busy={busy} onCancel={onCancel} revealed={revealed}>
      <td>
        {cell("operationDate", "Date", (props) => (
          <input {...props} type="date" />
        ))}
      </td>
      <th scope="row">
        {cell("title", "Titre", (props) => (
          <input {...props} ref={titleRef} maxLength={50} />
        ))}
      </th>
      <td>
        {cell("categoryId", "Catégorie", (props) => (
          <CategorySelect {...props} categories={categories} />
        ))}
      </td>
      <td>
        {cell(
          "kind",
          "Type",
          select([
            ["DEPENSE", "Dépense"],
            ["ENTREE", "Entrée"],
          ])
        )}
      </td>
      <td className="inline-cell-host--amount">
        {cell(
          "amount",
          `Montant (${values.currency})`,
          (props) => (
            <input {...props} inputMode="decimal" />
          ),
          "inline-cell--amount"
        )}
      </td>
      <td>
        <InlineActions
          formId={formId}
          onSubmit={submit}
          busy={busy}
          saveDisabled={Boolean(assignment.link.occurrence?.closed)}
          onCancel={onCancel}
          onMoreOptions={
            onMoreOptions
              ? () => onMoreOptions(asOperation(operation, values))
              : undefined
          }
          revealed={revealed}
          onReveal={() => setRevealed((current) => !current)}
          message={mutationError || undefined}
        >
          {cell(
            "currency",
            "Devise",
            select([
              ["EUR", "EUR"],
              ["USD", "USD"],
            ])
          )}
          <EnvelopeAssignment
            assignment={assignment}
            busy={busy}
            error={errors.reconciliation}
            form={formId}
          />
        </InlineActions>
      </td>
    </InlineEditorRow>
  );
};

import { CategorySelect } from "../Categories/CategorySelect";
import { FixedEnvelopeFields } from "./FixedEnvelopeFields";
import {
  compatibleFixedCategories,
  fixedCategoryBody,
  validateFixedCategory,
} from "../../utils/fixedCategories";
import React, { useRef, useState } from "react";
import {
  CHARGE_PERIODS,
  chargeBody,
  chargeInitialValues,
  chargePreview,
  validateCharge,
} from "../../utils/fixedCharges";
import {
  incomeBody,
  incomeInitialValues,
  validateIncome,
} from "../../utils/fixedIncome";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { useFormFocus } from "../../hooks/useFormFocus";
import { LiveMessage } from "../LiveMessage";
import {
  InlineActions,
  InlineCell,
  InlineEditorRow,
} from "../CompactOperations/InlineEditing";

/** Cell-sized messages; the full message stays in the description. */
const SHORT = {
  titre: "2 à 50 caractères",
  montant: "Invalide, ex. 120,50",
  periodicite: "Périodicité requise",
  categoryId: "Catégorie invalide",
};
const SECONDARY = new Set([
  "pourcentagePersonnel",
  "devise",
  "isBudgetEnvelope",
  "effectiveMonth",
]);

/** Inline row editor of a fixed charge or income, in the compact ledger. */
export const FixedInlineEditor = ({
  row,
  busy,
  draft,
  onDraftChange,
  onSave,
  onClose,
  onMoreOptions,
  categories,
  categoryError,
}) => {
  const income = row.kind === "income";
  const [values, setValues] = useState(
    () =>
      draft ?? {
        ...(income ? incomeInitialValues(row) : chargeInitialValues(row)),
        ...(categories
          ? {
              categoryId: String(row.categoryId ?? ""),
            }
          : {}),
      }
  );
  const [errors, setErrors] = useState({});
  const [revealed, setRevealed] = useState(false);
  const titleRef = useRef(null);
  const saving = useRef(false);
  useFormFocus(titleRef);
  const formId = `fixed-inline-${row.kind}-${row.idOperationFixe}`;
  const preview = income
    ? Object.keys(validateIncome(values)).length
      ? null
      : {
          montantPersonnel: incomeBody(values).montant,
          montantMensuelPersonnel: incomeBody(values).montant,
        }
    : chargePreview(values);
  const amount = (field) =>
    preview ? formatMoney(preview[field], values.devise) : "Indisponible";
  const change = ({ target: { name, value, type, checked } }) => {
    const next = {
      ...values,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "periodicite" && value !== "MENSUELLE"
        ? { isBudgetEnvelope: false }
        : {}),
    };
    setValues(next);
    onDraftChange(next);
    setErrors((current) => ({
      ...current,
      [name]: null,
    }));
  };
  const cell = (name, label, control, hint) => (
    <InlineCell
      id={`${formId}-${name}`}
      label={label}
      error={errors[name]}
      shortError={SHORT[name]}
      hint={hint}
    >
      {(aria) =>
        control({
          ...aria,
          name,
          form: formId,
          value: values[name] ?? "",
          onChange: change,
          disabled: busy,
        })
      }
    </InlineCell>
  );
  const options = (list) => (props) =>
    (
      <select {...props}>
        {list.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  const decimal = (props) => <input {...props} inputMode="decimal" />;
  const submit = async (event) => {
    event.preventDefault();
    if (saving.current || busy) return;
    const next = income ? validateIncome(values) : validateCharge(values);
    const categoryFailure = validateFixedCategory(values, categories, row.kind);
    if (categoryFailure) next.categoryId = categoryFailure;
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
      if (
        await onSave({
          ...(income ? incomeBody(values) : chargeBody(values)),
          ...fixedCategoryBody(values),
        })
      )
        onClose();
    } finally {
      saving.current = false;
    }
  };
  const categoryCell = () => {
    if (!categories) return null;
    const id = `${formId}-categoryId`;
    const choices = compatibleFixedCategories(categories.categories, row.kind);
    const notice =
      categories.status === "loading"
        ? "Chargement des catégories…"
        : categories.status === "error"
        ? "Catégories indisponibles. Votre choix est conservé."
        : undefined;
    const field = (
      <InlineCell
        id={id}
        label="Catégorie"
        error={errors.categoryId || categoryError}
        shortError={SHORT.categoryId}
        hint={notice}
      >
        {(aria) => (
          <CategorySelect
            {...aria}
            name="categoryId"
            form={formId}
            value={values.categoryId ?? ""}
            onChange={change}
            categories={choices}
            currentCategory={
              choices.find(
                (category) => String(category.id) === String(values.categoryId)
              ) ?? row.category
            }
            placeholder="Non catégorisé"
            disabled={busy || categories.status !== "success"}
          />
        )}
      </InlineCell>
    );
    // Degraded read failure, not a validation error: the row may grow here.
    if (categories.status !== "error") return field;
    return (
      <>
        {field}
        <button
          type="button"
          className="one-off-button one-off-button--secondary"
          disabled={busy}
          onClick={categories.retry}
        >
          Réessayer les catégories
        </button>
      </>
    );
  };
  const monthly = (
    <>
      <output aria-label="Aperçu mensuel personnel">
        {amount("montantMensuelPersonnel")}
      </output>{" "}
      / mois
      {!income && preview && ` · ${values.pourcentagePersonnel} %`}
    </>
  );
  return (
    <InlineEditorRow
      busy={busy}
      onCancel={onClose}
      revealed={revealed}
      className="fixed-inline"
    >
      <td>
        {income ? (
          <span className="inline-cell inline-cell--static">Mensuelle</span>
        ) : (
          cell(
            "periodicite",
            "Périodicité",
            options(
              CHARGE_PERIODS.map((option) => ({
                value: option.value,
                label: option.label.split(" — ")[0],
              }))
            )
          )
        )}
      </td>
      <th scope="row">
        {cell(
          "titre",
          income ? "Titre de l’entrée" : "Titre de la charge",
          (props) => (
            <input {...props} ref={titleRef} maxLength={50} />
          )
        )}
      </th>
      <td>{categoryCell()}</td>
      <td>
        <span
          className={`fixed-operations__badge fixed-operations__badge--${row.kind}`}
        >
          {income ? "Entrée" : "Charge"}
        </span>
      </td>
      <td className="inline-cell-host--amount">
        {cell(
          "montant",
          income ? "Montant reçu par mois" : "Montant total par échéance",
          decimal,
          monthly
        )}
      </td>
      <td>
        <InlineActions
          formId={formId}
          onSubmit={submit}
          busy={busy}
          saveLabel={income ? "Enregistrer l’entrée" : "Enregistrer la charge"}
          onCancel={onClose}
          onMoreOptions={
            onMoreOptions ? () => onMoreOptions(values) : undefined
          }
          revealed={revealed}
          onReveal={() => setRevealed((current) => !current)}
          live={
            <LiveMessage
              isError
              message={
                Object.values(errors).some(Boolean)
                  ? "Vérifiez les champs indiqués."
                  : ""
              }
            />
          }
        >
          {!income &&
            cell("pourcentagePersonnel", "Ma part de la charge (%)", decimal)}
          {cell(
            "devise",
            income ? "Devise de l’entrée" : "Devise de la charge",
            options(["EUR", "USD"].map((value) => ({ value, label: value })))
          )}
          <FixedEnvelopeFields
            values={values}
            onChange={change}
            income={income}
            editing
            disabled={busy}
            form={formId}
            error={errors.isBudgetEnvelope || errors.effectiveMonth}
          />
        </InlineActions>
      </td>
    </InlineEditorRow>
  );
};

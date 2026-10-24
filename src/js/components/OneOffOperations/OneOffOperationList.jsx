import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { CompactMoneyList } from "../CompactOperations/CompactMoneyList";
import { OneOffInlineEditor } from "./OneOffInlineEditor";
import { formatMoney } from "../BudgetCalendar/budgetFormat";
export const OneOffOperationList = ({
  categories,
  operations,
  onEdit,
  onDelete,
  editingId,
  onSave,
  onCancel,
  busy = false,
  mutationError,
}) => {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rows = operations.map((o) => ({
    id: `operation-${o.id}`,
    title: o.title,
    kind: o.type === "ENTREE" ? "income" : "expense",
    amount: formatMoney(o.amount, o.currency),
    date: o.operationDate.split("-").reverse().join("/"),
    category: byId.get(o.categoryId),
    raw: o,
  }));
  return (
    <CompactMoneyList
      rows={rows}
      label="Opérations ponctuelles enregistrées"
      sort={{ field: "date", direction: "desc" }}
      editingId={editingId ? `operation-${editingId}` : null}
      renderEditor={({ raw }) => (
        <OneOffInlineEditor
          operation={raw}
          categories={categories}
          busy={busy}
          onSave={onSave}
          onCancel={onCancel}
          mutationError={mutationError}
        />
      )}
      renderActions={({ raw }) => (
        <div>
          <button
            type="button"
            id={`one-off-edit-${raw.id}`}
            className="one-off-icon-button"
            disabled={busy || Boolean(editingId)}
            onClick={(e) => onEdit(raw, e)}
            aria-label={`Modifier ${raw.title}`}
          >
            <FontAwesomeIcon icon={faPen} aria-hidden="true" />
          </button>
          {onDelete && (
            <button
              type="button"
              className="one-off-icon-button"
              disabled={busy || Boolean(editingId)}
              onClick={(e) => onDelete(raw, e)}
              aria-label={`Supprimer ${raw.title}`}
            >
              <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      renderDetails={({ raw, category }) => (
        <dl>
          <dt>Date</dt>
          <dd>{raw.operationDate.split("-").reverse().join("/")}</dd>
          <dt>Catégorie</dt>
          <dd>{category?.name ?? "Catégorie indisponible"}</dd>
          <dt>Type</dt>
          <dd>{raw.type === "ENTREE" ? "Entrée" : "Dépense"}</dd>
          <dt>Montant</dt>
          <dd>{formatMoney(raw.amount, raw.currency)}</dd>
        </dl>
      )}
    />
  );
};

import React, { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSort,
  faSortDown,
  faSortUp,
} from "@fortawesome/free-solid-svg-icons";
import { CategoryLabel, CategoryMark } from "../Categories/CategoryLabel";
import "../../../css/CompactMoneyList.css";

const SORT_ICONS = {
  ascending: faSortUp,
  descending: faSortDown,
  none: faSort,
};

/**
 * `sortHeaders[field]` (`{ ariaSort, label, onSort }`) rend l'en-tête triable ;
 * `filters[field]` place un champ de filtre sous son nom (#361). Le tri et les
 * filtres appartiennent à l'écran : ce composant n'en applique aucun.
 */
export const CompactMoneyList = ({
  rows,
  label,
  fixed = false,
  editingId,
  renderEditor,
  renderActions,
  renderDetails,
  sortHeaders = {},
  filters = {},
  toolbar = null,
  busy = false,
  emptyMessage = "Aucun élément ne correspond à ces filtres.",
}) => {
  const [expanded, setExpanded] = useState(null);
  const frozen = useRef(null);
  if (editingId && frozen.current?.id !== editingId)
    frozen.current = { id: editingId, rows };
  if (!editingId) frozen.current = null;
  const visible = frozen.current?.rows ?? rows;
  const editing = Boolean(editingId);
  return (
    <div className="compact-money-list">
      {toolbar}
      {fixed && (
        <p className="compact-money-list__scope">
          Montants personnels par mois.
        </p>
      )}
      <table
        className="compact-money-table"
        aria-label={label}
        aria-busy={busy || undefined}
      >
        <thead>
          <tr>
            {[
              ["date", fixed ? "Périodicité" : "Date"],
              ["title", "Libellé"],
              ["category", "Catégorie"],
              ["kind", "Type"],
              ["amount", fixed ? "Personnel / mois" : "Montant"],
              ["actions", "Actions"],
            ].map(([field, text]) => {
              const header = sortHeaders[field];
              return (
                <th
                  key={field}
                  scope="col"
                  aria-sort={
                    header && header.ariaSort !== "none"
                      ? header.ariaSort
                      : undefined
                  }
                >
                  <div className="compact-money-table__heading">
                    {header ? (
                      <button
                        type="button"
                        className="compact-money-table__sort"
                        aria-label={header.label}
                        disabled={editing || header.disabled}
                        onClick={header.onSort}
                      >
                        <span>{text}</span>
                        <FontAwesomeIcon
                          icon={SORT_ICONS[header.ariaSort]}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <span>{text}</span>
                    )}
                    {filters[field]}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <React.Fragment key={row.id}>
              {editingId === row.id ? (
                renderEditor(row)
              ) : (
                <tr className="compact-money-table__row">
                  <td className="compact-money-table__date">{row.date}</td>
                  <th scope="row" className="compact-money-table__title">
                    <span className="compact-money-table__mobile-icon">
                      <CategoryMark category={row.category} />
                    </span>
                    <button
                      type="button"
                      aria-expanded={expanded === row.id}
                      aria-controls={`${row.id}-details`}
                      title={row.title}
                      onClick={() =>
                        setExpanded(expanded === row.id ? null : row.id)
                      }
                    >
                      {row.title}
                    </button>
                  </th>
                  <td className="compact-money-table__category">
                    <CategoryLabel category={row.category} />
                  </td>
                  <td className="compact-money-table__kind">
                    {row.kind === "income"
                      ? "Entrée"
                      : fixed
                      ? "Charge"
                      : "Dépense"}
                  </td>
                  <td
                    className={`compact-money-table__amount compact-money-table__amount--${row.kind}`}
                  >
                    <span>
                      {row.kind === "income" ? "+" : "−"} {row.amount}
                    </span>
                    {fixed && <small> / mois</small>}
                  </td>
                  <td className="compact-money-table__actions">
                    {renderActions(row)}
                  </td>
                </tr>
              )}
              {expanded === row.id && editingId !== row.id && (
                <tr
                  className="compact-money-table__details"
                  id={`${row.id}-details`}
                >
                  <td colSpan={6}>
                    <strong>{row.title}</strong>
                    {renderDetails(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {!visible.length && (
        <p role="status" className="compact-money-list__empty">
          {emptyMessage}
        </p>
      )}
    </div>
  );
};

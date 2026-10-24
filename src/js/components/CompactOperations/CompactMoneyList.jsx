import React, { useRef, useState } from "react";
import { CategoryLabel, CategoryMark } from "../Categories/CategoryLabel";
import "../../../css/CompactMoneyList.css";

export const CompactMoneyList = ({
  rows,
  label,
  fixed = false,
  editingId,
  renderEditor,
  renderActions,
  renderDetails,
  sortControls,
  sort,
}) => {
  const [kind, setKind] = useState("all"),
    [query, setQuery] = useState(""),
    [expanded, setExpanded] = useState(null);
  const frozen = useRef(null);
  const filtered = rows.filter(
    (row) =>
      (kind === "all" || row.kind === kind) &&
      `${row.title} ${row.category?.name ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr"))
  );
  if (editingId && frozen.current?.id !== editingId)
    frozen.current = { id: editingId, rows: filtered };
  if (!editingId) frozen.current = null;
  const visible = frozen.current?.rows ?? filtered;
  const ariaSort = (field) =>
    sort?.field === field
      ? sort.direction === "asc"
        ? "ascending"
        : "descending"
      : undefined;
  return (
    <div className="compact-money-list">
      <div
        className="compact-money-list__filters"
        role="group"
        aria-label="Filtrer par type"
      >
        {[
          ["all", "Tout"],
          ["expense", fixed ? "Charges" : "Dépenses"],
          ["income", "Entrées"],
        ].map(([value, text]) => (
          <button
            type="button"
            key={value}
            aria-pressed={kind === value}
            disabled={Boolean(editingId)}
            onClick={() => setKind(value)}
          >
            {text}{" "}
            <span>
              {
                rows.filter((row) => value === "all" || row.kind === value)
                  .length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="compact-money-list__tools">
        <label>
          Rechercher dans les éléments chargés
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={Boolean(editingId)}
            placeholder="Libellé ou catégorie"
          />
        </label>
        {sortControls}
      </div>
      <p className="compact-money-list__scope">
        Recherche et filtres limités aux éléments chargés.
        {fixed && " Montants personnels par mois."}
      </p>
      <table className="compact-money-table" aria-label={label}>
        <thead>
          <tr>
            {[
              ["date", fixed ? "Périodicité" : "Date"],
              ["title", "Libellé"],
              ["category", "Catégorie"],
              ["kind", "Type"],
              ["amount", fixed ? "Personnel / mois" : "Montant"],
              ["actions", "Actions"],
            ].map(([field, text]) => (
              <th key={field} scope="col" aria-sort={ariaSort(field)}>
                {text}
              </th>
            ))}
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
        <p role="status">
          Aucun élément parmi les données chargées pour ces filtres.
        </p>
      )}
      <p className="compact-money-list__scope">
        {visible.length} sur {rows.length} éléments chargés
      </p>
    </div>
  );
};

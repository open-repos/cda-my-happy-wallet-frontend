import React, { useId, useState } from "react";
import "../../../css/TableQuery.css";

/**
 * Contrôles de tri et de filtre d'un tableau (#361). Le panneau repliable
 * donne accès à tous les critères de tri, y compris ceux sans colonne, à
 * toutes les largeurs. Sous 64rem, les en-têtes sont masqués : les filtres y
 * sont passés en `children`.
 */
export const TableQueryPanel = ({
  sortOptions,
  sortValue,
  orderValue,
  defaultSortLabel,
  onSortChange,
  onOrderChange,
  activeFilters,
  onClear,
  disabled = false,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  const panelId = `${id}-panel`;
  const filterText =
    activeFilters === 0
      ? ""
      : ` (${activeFilters} filtre${activeFilters > 1 ? "s" : ""})`;
  return (
    <div className="table-query">
      <div className="table-query__bar">
        <button
          type="button"
          className="table-query__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          Trier et filtrer{filterText}
        </button>
        {activeFilters > 0 && (
          <button
            type="button"
            className="table-query__clear"
            disabled={disabled}
            onClick={onClear}
          >
            Effacer les filtres
          </button>
        )}
      </div>
      <div
        id={panelId}
        className="table-query__panel"
        role="group"
        aria-label="Tri et filtres"
        hidden={!open}
      >
        <div className="table-query__sort">
          <div className="table-query__field">
            <label htmlFor={`${id}-sort`}>Trier par</label>
            <select
              id={`${id}-sort`}
              value={sortValue}
              disabled={disabled}
              onChange={(event) => onSortChange(event.target.value || null)}
            >
              <option value="">{defaultSortLabel}</option>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="table-query__field">
            <label htmlFor={`${id}-order`}>Ordre du tri</label>
            <select
              id={`${id}-order`}
              value={orderValue}
              disabled={disabled || !sortValue}
              onChange={(event) => onOrderChange(event.target.value)}
            >
              <option value="asc">Croissant</option>
              <option value="desc">Décroissant</option>
            </select>
          </div>
        </div>
        {children && <div className="table-query__filters">{children}</div>}
      </div>
    </div>
  );
};

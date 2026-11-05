import React, { useMemo } from "react";
import { FilterCombobox } from "../Fields/FilterCombobox";
import { SelectFilter } from "../TableQuery/ColumnFilters";
import { TableQueryPanel } from "../TableQuery/TableQueryPanel";
import { createArrayOptionSource } from "../../utils/filterOptions";
import { CHARGE_PERIODS } from "../../utils/fixedCharges";
import { FIXED_SORT_FIELDS } from "../../utils/fixedOperations";
import {
  EMPTY_FIXED_FILTERS,
  FIXED_DEFAULT_SORT,
  ariaSortOf,
  countActiveFilters,
  nextSort,
  sortButtonLabel,
} from "../../utils/tableQuery";

/** Colonne du tableau → critère de tri de `sortFixedOperations`. Les autres
 * critères (total, devise, part, personnel par échéance) restent dans le
 * panneau, faute de colonne. */
const COLUMN_FIELDS = {
  date: "periodicite",
  title: "titre",
  category: "category",
  kind: "kind",
  amount: "montantMensuelPersonnel",
};
const COLUMN_TEXT = {
  date: "Périodicité",
  title: "Libellé",
  category: "Catégorie",
  kind: "Type",
  amount: "Personnel / mois",
};
const KIND_OPTIONS = [
  { value: "charge", label: "Charge" },
  { value: "income", label: "Entrée" },
];
const PERIOD_OPTIONS = CHARGE_PERIODS.map(({ value, label }) => ({
  value,
  label: label.split(" — ")[0],
}));

const columnSort = (sort) => {
  if (!sort) return null;
  const column = Object.keys(COLUMN_FIELDS).find(
    (key) => COLUMN_FIELDS[key] === sort.field
  );
  return column ? { field: column, order: sort.order } : null;
};

/**
 * En-têtes et filtres des charges et entrées fixes. La liste est déjà chargée
 * en entier : tri et filtres s'appliquent dans le navigateur (D1 de #359).
 */
export const useFixedTableQuery = ({
  query,
  onChange,
  rows,
  disabled,
  wide,
}) => {
  const { sort, filters } = query;
  const setFilters = (patch) =>
    onChange({ sort, filters: { ...filters, ...patch } });
  const setSort = (next) => onChange({ sort: next, filters });
  const titleOptions = useMemo(
    () =>
      [...new Set(rows.map((row) => row.titre))]
        .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }))
        .map((title) => ({ value: title, label: title })),
    [rows]
  );
  const categoryOptions = useMemo(() => {
    const seen = new Map();
    for (const row of rows) {
      const value = row.categoryId == null ? "none" : String(row.categoryId);
      if (!seen.has(value))
        seen.set(value, {
          value,
          label:
            row.category?.name ??
            (row.categoryId == null
              ? "Non catégorisé"
              : "Catégorie indisponible"),
        });
    }
    return [...seen.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
    );
  }, [rows]);
  const loadTitles = useMemo(
    () => createArrayOptionSource(titleOptions),
    [titleOptions]
  );
  const loadCategories = useMemo(
    () => createArrayOptionSource(categoryOptions),
    [categoryOptions]
  );
  const shown = columnSort(sort);
  const defaultShown = columnSort(FIXED_DEFAULT_SORT);
  const sortHeaders = Object.fromEntries(
    Object.entries(COLUMN_TEXT).map(([column, text]) => [
      column,
      {
        ariaSort: ariaSortOf(
          sort ? shown : null,
          column,
          sort ? null : defaultShown
        ),
        label: sortButtonLabel(
          text,
          sort ? shown : null,
          column,
          sort ? null : defaultShown,
          defaultShown
        ),
        onSort: () => {
          // Comme pour les opérations : l'état égal à l'ordre par défaut est
          // sauté, explicite ou non.
          const next = nextSort(shown, column, defaultShown);
          setSort(next && { field: COLUMN_FIELDS[column], order: next.order });
        },
        disabled,
      },
    ])
  );
  const fields = {
    date: (
      <SelectFilter
        label="Filtrer par périodicité"
        allLabel="Toutes"
        value={filters.period}
        options={PERIOD_OPTIONS}
        disabled={disabled}
        onChange={(period) => setFilters({ period })}
      />
    ),
    title: (
      <FilterCombobox
        label="Filtrer par libellé"
        hideLabel={wide}
        placeholder="Libellé…"
        value={
          filters.title ? { value: filters.title, label: filters.title } : null
        }
        onChange={(option) => setFilters({ title: option?.value ?? "" })}
        loadOptions={loadTitles}
        disabled={disabled}
      />
    ),
    category: (
      <FilterCombobox
        label="Filtrer par catégorie"
        hideLabel={wide}
        placeholder="Catégorie…"
        multiple
        value={categoryOptions.filter((option) =>
          filters.categoryIds.includes(option.value)
        )}
        onChange={(options) =>
          setFilters({ categoryIds: options.map((option) => option.value) })
        }
        loadOptions={loadCategories}
        disabled={disabled}
      />
    ),
    kind: (
      <SelectFilter
        label="Filtrer par type"
        value={filters.kind}
        options={KIND_OPTIONS}
        disabled={disabled}
        onChange={(kind) => setFilters({ kind })}
      />
    ),
  };
  const toolbar = (
    <TableQueryPanel
      sortOptions={FIXED_SORT_FIELDS}
      sortValue={sort?.field ?? ""}
      orderValue={sort?.order ?? FIXED_DEFAULT_SORT.order}
      defaultSortLabel="Par défaut (personnel / mois, décroissant)"
      onSortChange={(field) =>
        setSort(field ? { field, order: sort?.order ?? "asc" } : null)
      }
      onOrderChange={(order) => sort && setSort({ ...sort, order })}
      activeFilters={countActiveFilters(filters)}
      onClear={() => onChange({ sort, filters: EMPTY_FIXED_FILTERS })}
      disabled={disabled}
    >
      {wide ? null : (
        <>
          {fields.date}
          {fields.title}
          {fields.category}
          {fields.kind}
        </>
      )}
    </TableQueryPanel>
  );
  return { sortHeaders, filters: wide ? fields : {}, toolbar };
};

import React, { useMemo } from "react";
import { FilterCombobox } from "../Fields/FilterCombobox";
import { RangeFilter, SelectFilter } from "../TableQuery/ColumnFilters";
import { TableQueryPanel } from "../TableQuery/TableQueryPanel";
import { createArrayOptionSource } from "../../utils/filterOptions";
import { oneOffOperationsService } from "../../services/oneOffOperationsService";
import {
  EMPTY_OPERATION_FILTERS,
  OPERATION_SORT_LABELS,
  ariaSortOf,
  countActiveFilters,
  nextSort,
  sortButtonLabel,
} from "../../utils/tableQuery";

/** Sans `sort`, l'API liste les plus récentes d'abord (#165). */
const DEFAULT_SORT = { field: "date", order: "desc" };
const COLUMNS = {
  date: "Date",
  title: "Libellé",
  category: "Catégorie",
  amount: "Montant",
};
const TYPE_OPTIONS = [
  { value: "DEPENSE", label: "Dépense" },
  { value: "ENTREE", label: "Entrée" },
];
const loadTitles = (request) =>
  oneOffOperationsService.listTitleSuggestions(request);

/**
 * En-têtes, filtres et panneau de la liste des opérations ponctuelles (D2 de
 * #359). Tri et filtres sont appliqués par l'API ; la colonne Type se filtre
 * sans se trier. `wide` place les filtres dans les en-têtes, sinon dans le
 * panneau.
 */
export const useOperationTableQuery = ({
  query,
  onChange,
  categories,
  disabled,
  wide,
}) => {
  const { sort, filters } = query;
  const setFilters = (patch) =>
    onChange({ sort, filters: { ...filters, ...patch } });
  const setSort = (next) => onChange({ sort: next, filters });
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const loadCategories = useMemo(
    () => createArrayOptionSource(categoryOptions),
    [categoryOptions]
  );
  const sortHeaders = Object.fromEntries(
    Object.entries(COLUMNS).map(([field, text]) => [
      field,
      {
        ariaSort: ariaSortOf(sort, field, DEFAULT_SORT),
        label: sortButtonLabel(text, sort, field, DEFAULT_SORT),
        onSort: () => setSort(nextSort(sort, field, DEFAULT_SORT)),
        disabled,
      },
    ])
  );
  const fields = {
    date: (
      <RangeFilter
        compact={wide}
        label="Filtrer par date"
        kind="date"
        from={filters.from}
        to={filters.to}
        disabled={disabled}
        onChange={({ from, to }) => setFilters({ from, to })}
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
          setFilters({
            categoryIds: options
              .map((option) => Number(option.value))
              .sort((a, b) => a - b),
          })
        }
        loadOptions={loadCategories}
        disabled={disabled}
      />
    ),
    kind: (
      <SelectFilter
        label="Filtrer par type"
        value={filters.type}
        options={TYPE_OPTIONS}
        disabled={disabled}
        onChange={(type) => setFilters({ type })}
      />
    ),
    amount: (
      <RangeFilter
        compact={wide}
        label="Filtrer par montant"
        kind="amount"
        from={filters.minAmount}
        to={filters.maxAmount}
        disabled={disabled}
        onChange={({ from, to }) =>
          setFilters({ minAmount: from, maxAmount: to })
        }
      />
    ),
  };
  const toolbar = (
    <TableQueryPanel
      sortOptions={Object.entries(COLUMNS).map(([value, label]) => ({
        value,
        label,
      }))}
      sortValue={sort?.field ?? ""}
      orderValue={sort?.order ?? DEFAULT_SORT.order}
      defaultSortLabel="Par défaut (plus récentes d’abord)"
      onSortChange={(field) =>
        setSort(field ? { field, order: sort?.order ?? "asc" } : null)
      }
      onOrderChange={(order) => sort && setSort({ ...sort, order })}
      activeFilters={countActiveFilters(filters)}
      onClear={() => onChange({ sort, filters: EMPTY_OPERATION_FILTERS })}
      disabled={disabled}
    >
      {wide ? null : (
        <>
          {fields.date}
          {fields.title}
          {fields.category}
          {fields.kind}
          {fields.amount}
        </>
      )}
    </TableQueryPanel>
  );
  return {
    sortHeaders,
    filters: wide ? fields : {},
    toolbar,
    sortLabels: OPERATION_SORT_LABELS,
  };
};

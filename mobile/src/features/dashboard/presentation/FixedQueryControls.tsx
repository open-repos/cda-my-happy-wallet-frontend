import { useMemo, useState } from "react";
import { FixedOperation } from "../domain/fixedBudget";
import {
  emptyFixedQuery,
  fixedCategoryLabel,
  FixedQuery,
  FIXED_PERIOD_CHOICES,
  FIXED_SORT_CHOICES,
} from "../domain/fixedOperationQuery";
import {
  ListQueryToolbar,
  FilterChip,
  useQueryAnnouncement,
} from "@/src/features/operations/presentation/ListQueryControls";
import {
  ListQueryModal,
  QueryFormState,
} from "@/src/features/operations/presentation/ListQueryModal";

export const FixedQueryControls = ({
  query,
  onChange,
  operations,
  disabled,
}: {
  query: FixedQuery;
  onChange(query: FixedQuery): void;
  operations: FixedOperation[];
  disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const { announcement, announce } = useQueryAnnouncement();
  const categoryChoices = useMemo(
    () =>
      [
        ...new Map(
          operations.map((row) => [
            row.categoryId == null ? "none" : String(row.categoryId),
            {
              value: row.categoryId == null ? "none" : String(row.categoryId),
              label: fixedCategoryLabel(row),
            },
          ]),
        ).values(),
      ].sort((a, b) =>
        a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
      ),
    [operations],
  );
  const titles = useMemo(
    () =>
      [...new Set(operations.map((row) => row.title))].sort((a, b) =>
        a.localeCompare(b, "fr", { sensitivity: "base" }),
      ),
    [operations],
  );
  const apply = (next: FixedQuery, message: string) => {
    if (JSON.stringify(query) !== JSON.stringify(next)) {
      onChange(next);
      announce(message);
    }
  };
  const sortText = query.sort
    ? `${FIXED_SORT_CHOICES.find((choice) => choice.value === query.sort?.field)?.label}, ${query.sort.order === "asc" ? "croissant" : "décroissant"}`
    : "personnel / mois, décroissant (par défaut)";
  const chips: FilterChip[] = [];
  if (query.title)
    chips.push({
      key: "title",
      label: `Libellé : ${query.title}`,
      remove: () => apply({ ...query, title: "" }, "Filtre de libellé retiré."),
    });
  if (query.categoryIds.length)
    chips.push({
      key: "categories",
      label: `Catégories : ${query.categoryIds.map((id) => categoryChoices.find((choice) => choice.value === id)?.label ?? "Catégorie indisponible").join(", ")}`,
      remove: () =>
        apply({ ...query, categoryIds: [] }, "Filtre de catégories retiré."),
    });
  if (query.kind)
    chips.push({
      key: "kind",
      label: query.kind === "income" ? "Entrées" : "Charges",
      remove: () => apply({ ...query, kind: "" }, "Filtre de type retiré."),
    });
  if (query.period)
    chips.push({
      key: "period",
      label: `Périodicité : ${FIXED_PERIOD_CHOICES.find((choice) => choice.value === query.period)?.label}`,
      remove: () =>
        apply({ ...query, period: "" }, "Filtre de périodicité retiré."),
    });
  const initial: QueryFormState = {
    sortField: query.sort?.field ?? "",
    order: query.sort?.order ?? "desc",
    title: query.title,
    categoryIds: query.categoryIds,
    kind: query.kind,
    period: query.period,
    from: "",
    to: "",
    minAmount: "",
    maxAmount: "",
  };
  return (
    <>
      <ListQueryToolbar
        chips={chips}
        sortText={sortText}
        announcement={announcement}
        disabled={disabled}
        onOpen={() => setOpen(true)}
        onClear={() =>
          apply(
            { ...emptyFixedQuery(), sort: query.sort },
            "Filtres effacés. Le tri est conservé.",
          )
        }
      />
      {open && (
        <ListQueryModal
          initial={initial}
          sortChoices={FIXED_SORT_CHOICES}
          defaultSortLabel="Par défaut (personnel / mois décroissant)"
          categories={categoryChoices}
          typeChoices={[
            { value: "charge", label: "Charges" },
            { value: "income", label: "Entrées" },
          ]}
          periods={FIXED_PERIOD_CHOICES}
          localTitles={titles}
          onClose={() => setOpen(false)}
          onApply={(draft) => {
            if (draft.title.length > 50)
              return ["Le libellé doit contenir au plus 50 caractères."];
            const field = FIXED_SORT_CHOICES.find(
              (choice) => choice.value === draft.sortField,
            )?.value;
            apply(
              {
                sort: field ? { field, order: draft.order } : null,
                title: draft.title,
                categoryIds: draft.categoryIds,
                kind:
                  draft.kind === "charge" || draft.kind === "income"
                    ? draft.kind
                    : "",
                period:
                  FIXED_PERIOD_CHOICES.find(
                    (choice) => choice.value === draft.period,
                  )?.value ?? "",
              },
              `Tri et filtres du budget fixe appliqués : ${field ? FIXED_SORT_CHOICES.find((choice) => choice.value === field)?.label : "personnel / mois"}, ordre ${draft.sortField ? (draft.order === "asc" ? "croissant" : "décroissant") : "décroissant"}.`,
            );
            setOpen(false);
            return [];
          }}
        />
      )}
    </>
  );
};

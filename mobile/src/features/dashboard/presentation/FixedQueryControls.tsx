import { useMemo, useState } from "react";
import { FixedOperation, fixedCategoryLabel } from "../domain/fixedBudget";
import {
  emptyFixedQuery,
  FixedQuery,
  FIXED_PERIOD_CHOICES,
  FIXED_SORT_CHOICES,
} from "../domain/fixedOperationQuery";
import { appliedQueryMessage } from "@/src/features/operations/domain/operationQuery";
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
  const sortTextOf = (q: FixedQuery) =>
    q.sort
      ? `${FIXED_SORT_CHOICES.find((choice) => choice.value === q.sort?.field)?.label}, ${q.sort.order === "asc" ? "croissant" : "décroissant"}`
      : "personnel / mois, décroissant (par défaut)";
  const sortText = sortTextOf(query);
  // Puces d'une requête : affichées pour la requête courante, lues pour
  // annoncer celle qui vient d'être appliquée.
  const chipsOf = (q: FixedQuery): FilterChip[] => {
    const chips: FilterChip[] = [];
    if (q.title)
      chips.push({
        key: "title",
        label: `Libellé : ${q.title}`,
        remove: () => apply({ ...q, title: "" }, "Filtre de libellé retiré."),
      });
    if (q.categoryIds.length)
      chips.push({
        key: "categories",
        label: `Catégories : ${q.categoryIds.map((id) => categoryChoices.find((choice) => choice.value === id)?.label ?? "Catégorie indisponible").join(", ")}`,
        remove: () =>
          apply({ ...q, categoryIds: [] }, "Filtre de catégories retiré."),
      });
    if (q.kind)
      chips.push({
        key: "kind",
        label: q.kind === "income" ? "Entrées" : "Charges",
        remove: () => apply({ ...q, kind: "" }, "Filtre de type retiré."),
      });
    if (q.period)
      chips.push({
        key: "period",
        label: `Périodicité : ${FIXED_PERIOD_CHOICES.find((choice) => choice.value === q.period)?.label}`,
        remove: () =>
          apply({ ...q, period: "" }, "Filtre de périodicité retiré."),
      });
    return chips;
  };
  const chips = chipsOf(query);
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
            const next: FixedQuery = {
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
            };
            apply(
              next,
              appliedQueryMessage(
                "Tri et filtres du budget fixe appliqués",
                sortTextOf(next),
                chipsOf(next).map((chip) => chip.label),
              ),
            );
            setOpen(false);
            return [];
          }}
        />
      )}
    </>
  );
};

import { isCalendarDate, OperationType } from "./oneOffOperation";

export type SortOrder = "asc" | "desc";
export interface ListSort<T extends string> {
  field: T;
  order: SortOrder;
}
export const OPERATION_SORT_CHOICES = [
  { value: "date", label: "Date" },
  { value: "title", label: "Libellé" },
  { value: "category", label: "Catégorie" },
  { value: "amount", label: "Montant" },
] as const;
export type OperationSortField =
  (typeof OPERATION_SORT_CHOICES)[number]["value"];
export interface OperationQuery {
  sort: ListSort<OperationSortField> | null;
  from: string;
  to: string;
  title: string;
  categoryIds: number[];
  type: OperationType | "";
  minAmount: string;
  maxAmount: string;
}
export interface OperationRequestFilter {
  from?: string;
  to?: string;
  currency?: string;
  sort?: OperationSortField;
  order?: SortOrder;
  title?: string;
  categoryId?: readonly number[];
  type?: OperationType;
  minAmount?: string;
  maxAmount?: string;
}
export const emptyOperationQuery = (): OperationQuery => ({
  sort: null,
  from: "",
  to: "",
  title: "",
  categoryIds: [],
  type: "",
  minAmount: "",
  maxAmount: "",
});
export const normalizeQueryAmount = (value: string): string | null => {
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/.exec(
    value.trim().replace(",", "."),
  );
  return match ? `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}` : null;
};
export type QueryErrors = Partial<
  Record<"dates" | "amounts" | "title" | "categories", string>
>;
export const validateOperationQuery = (query: OperationQuery): QueryErrors => {
  const errors: QueryErrors = {};
  if (
    (query.from && !isCalendarDate(query.from)) ||
    (query.to && !isCalendarDate(query.to)) ||
    (query.from && query.to && query.from > query.to)
  )
    errors.dates =
      "Saisissez des dates valides, du début à la fin de la période.";
  const min = query.minAmount ? normalizeQueryAmount(query.minAmount) : null;
  const max = query.maxAmount ? normalizeQueryAmount(query.maxAmount) : null;
  if (
    (query.minAmount && min === null) ||
    (query.maxAmount && max === null) ||
    (min !== null &&
      max !== null &&
      BigInt(min.replace(".", "")) > BigInt(max.replace(".", "")))
  )
    errors.amounts =
      "Saisissez des montants de 0 à 99 999 999,99, avec un minimum inférieur ou égal au maximum.";
  if (query.title.trim().length > 50)
    errors.title = "Le libellé doit contenir au plus 50 caractères.";
  if (
    new Set(query.categoryIds).size > 20 ||
    query.categoryIds.some(
      (id) => !Number.isInteger(id) || id < 1 || id > 2147483647,
    )
  )
    errors.categories = "Choisissez au plus 20 catégories.";
  return errors;
};
export const operationRequestFilter = (
  query: OperationQuery,
): OperationRequestFilter => {
  if (Object.keys(validateOperationQuery(query)).length)
    throw new Error("Invalid operation query");
  return {
    ...(query.sort ? { sort: query.sort.field, order: query.sort.order } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.title.trim() ? { title: query.title.trim() } : {}),
    ...(query.categoryIds.length
      ? { categoryId: [...new Set(query.categoryIds)].sort((a, b) => a - b) }
      : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.minAmount
      ? { minAmount: normalizeQueryAmount(query.minAmount)! }
      : {}),
    ...(query.maxAmount
      ? { maxAmount: normalizeQueryAmount(query.maxAmount)! }
      : {}),
  };
};

export const foldQueryText = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");
export const countQueryFilters = (filters: object): number =>
  Object.entries(filters).filter(
    ([key, value]) =>
      key !== "sort" &&
      (Array.isArray(value) ? value.length > 0 : Boolean(value)),
  ).length;

/** « 1 filtre », « 2 filtres » : accord du nom ou du participe. */
export const countLabel = (count: number, word: string): string =>
  `${count} ${word}${count > 1 ? "s" : ""}`;

/** Annonce d'application : tri puis chaque filtre actif, ou leur absence. */
export const appliedQueryMessage = (
  subject: string,
  sortText: string,
  filterLabels: readonly string[],
): string =>
  `${subject} : ${sortText}. ${
    filterLabels.length
      ? `${countLabel(filterLabels.length, "filtre")} : ${filterLabels.join(" ; ")}.`
      : "Aucun filtre."
  }`;

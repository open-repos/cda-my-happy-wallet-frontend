/** Tri et filtres des tableaux depuis leurs en-têtes (#361), conservés dans
 * l'URL (décision D3 de #359). Fonctions pures, sans React. */

/**
 * Un clic sur un en-tête : croissant, puis décroissant, puis sans tri. Un état
 * identique à l'ordre par défaut est sauté : sur la colonne par défaut, le
 * cycle alterne donc croissant et ordre par défaut.
 */
export const nextSort = (sort, field, defaultSort = null) => {
  const next =
    sort?.field !== field
      ? { field, order: "asc" }
      : sort.order === "asc"
      ? { field, order: "desc" }
      : null;
  return next &&
    next.field === defaultSort?.field &&
    next.order === defaultSort?.order
    ? null
    : next;
};

/** `aria-sort` d'une colonne ; sans tri explicite, l'ordre par défaut. */
export const ariaSortOf = (sort, field, defaultSort = null) => {
  const active = sort ?? defaultSort;
  if (active?.field !== field) return "none";
  return active.order === "asc" ? "ascending" : "descending";
};

const ORDER_TEXT = { asc: "croissant", desc: "décroissant" };

/** Libellé accessible du bouton de tri : état actuel puis effet du clic. */
/** `cycleDefault` : ordre par défaut sauté par le cycle, s'il diffère de
 * celui qui décrit l'état affiché. */
export const sortButtonLabel = (
  columnLabel,
  sort,
  field,
  defaultSort,
  cycleDefault = defaultSort
) => {
  const state = ariaSortOf(sort, field, defaultSort);
  const next = nextSort(sort, field, cycleDefault);
  const current =
    state === "none"
      ? "non trié"
      : `trié par ordre ${ORDER_TEXT[state === "ascending" ? "asc" : "desc"]}${
          sort == null ? " (par défaut)" : ""
        }`;
  const action = next
    ? `trier par ordre ${ORDER_TEXT[next.order]}`
    : "revenir à l’ordre par défaut";
  // « Trier : » d'abord, pour ne pas confondre le bouton avec un champ du même
  // nom (« Montant », « Date ») dans un formulaire de la page.
  return `Trier : ${columnLabel}, ${current}. Activer pour ${action}.`;
};

/** Phrase annoncée après un changement de tri. */
export const sortAnnouncement = (sort, labels, defaultText) =>
  sort
    ? `Liste triée par ${labels[sort.field]}, ordre ${ORDER_TEXT[sort.order]}.`
    : `Liste dans l’ordre par défaut : ${defaultText}.`;

// --- Opérations ponctuelles : mêmes noms et règles que l'API (#165). ---

export const OPERATION_SORT_FIELDS = ["date", "title", "category", "amount"];
export const OPERATION_SORT_LABELS = {
  date: "date",
  title: "libellé",
  category: "catégorie",
  amount: "montant",
};
const AMOUNT = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/;
const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CATEGORY_FILTERS = 20;

/** Montant saisi (`12,5` ou `12.5`) au format de l'API (`12.50`), ou null. */
export const normalizeAmount = (value) => {
  const match = AMOUNT.exec(
    String(value ?? "")
      .trim()
      .replace(",", ".")
  );
  return match ? `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}` : null;
};

export const isCivilDate = (value) =>
  CIVIL_DATE.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

const cents = (amount) => Math.round(Number(amount) * 100);

export const EMPTY_OPERATION_FILTERS = Object.freeze({
  from: "",
  to: "",
  title: "",
  categoryIds: [],
  type: "",
  minAmount: "",
  maxAmount: "",
});

/**
 * État de la liste lu dans l'URL. Une valeur invalide est ignorée plutôt que
 * transmise : l'API la refuserait en `422` et la liste resterait vide.
 */
export const parseOperationQuery = (search) => {
  const params = new URLSearchParams(search);
  const field = params.get("sort");
  const order = params.get("order");
  const sort = OPERATION_SORT_FIELDS.includes(field)
    ? { field, order: order === "desc" ? "desc" : "asc" }
    : null;
  const date = (name) => {
    const value = params.get(name) ?? "";
    return isCivilDate(value) ? value : "";
  };
  let from = date("from"),
    to = date("to");
  if (from && to && from > to) [from, to] = ["", ""];
  const title = (params.get("title") ?? "").trim();
  const categoryIds = [
    ...new Set(
      params
        .getAll("categoryId")
        .filter((value) => /^[1-9]\d{0,9}$/.test(value))
        .map(Number)
        .filter((id) => id <= 2147483647)
    ),
  ]
    .sort((a, b) => a - b)
    .slice(0, MAX_CATEGORY_FILTERS);
  const type = ["DEPENSE", "ENTREE"].includes(params.get("type"))
    ? params.get("type")
    : "";
  let minAmount = normalizeAmount(params.get("minAmount")) ?? "",
    maxAmount = normalizeAmount(params.get("maxAmount")) ?? "";
  if (minAmount && maxAmount && cents(minAmount) > cents(maxAmount))
    [minAmount, maxAmount] = ["", ""];
  return {
    sort,
    filters: {
      from,
      to,
      title: title.length <= 50 ? title : "",
      categoryIds,
      type,
      minAmount,
      maxAmount,
    },
  };
};

/** Paramètres d'URL, et aussi de l'API : les noms sont identiques. */
export const operationQueryParams = ({ sort, filters }) => {
  const params = new URLSearchParams();
  if (sort) {
    params.set("sort", sort.field);
    params.set("order", sort.order);
  }
  for (const name of ["from", "to", "title", "type", "minAmount", "maxAmount"])
    if (filters[name]) params.set(name, filters[name]);
  for (const id of filters.categoryIds) params.append("categoryId", String(id));
  return params;
};

/** Objet de paramètres pour axios ; `categoryId` reste un tableau répété. */
export const operationApiParams = (query) => {
  const params = {};
  for (const [name, value] of operationQueryParams(query))
    params[name] =
      name === "categoryId" ? [...(params[name] ?? []), value] : value;
  return params;
};

export const countActiveFilters = (filters) =>
  Object.values(filters).filter((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  ).length;

// --- Charges et entrées fixes : tri et filtres dans le navigateur (D1). ---

export const FIXED_DEFAULT_SORT = Object.freeze({
  field: "montantMensuelPersonnel",
  order: "desc",
});
export const EMPTY_FIXED_FILTERS = Object.freeze({
  title: "",
  categoryIds: [],
  kind: "",
  period: "",
});

/** `categoryId=none` désigne les éléments sans catégorie. */
const fixedCategoryKey = (row) =>
  row.categoryId == null ? "none" : String(row.categoryId);

export const parseFixedQuery = (search, { sortFields, periods }) => {
  const params = new URLSearchParams(search);
  const field = params.get("sort");
  const order = params.get("order");
  const sort = sortFields.includes(field)
    ? { field, order: order === "desc" ? "desc" : "asc" }
    : null;
  const title = (params.get("title") ?? "").trim();
  return {
    sort,
    filters: {
      title: title.length <= 50 ? title : "",
      categoryIds: [
        ...new Set(
          params
            .getAll("categoryId")
            .filter((value) => value === "none" || /^[1-9]\d{0,9}$/.test(value))
        ),
      ],
      kind: ["charge", "income"].includes(params.get("type"))
        ? params.get("type")
        : "",
      period: periods.includes(params.get("period"))
        ? params.get("period")
        : "",
    },
  };
};

export const fixedQueryParams = ({ sort, filters }) => {
  const params = new URLSearchParams();
  if (sort) {
    params.set("sort", sort.field);
    params.set("order", sort.order);
  }
  if (filters.title) params.set("title", filters.title);
  for (const id of filters.categoryIds) params.append("categoryId", id);
  if (filters.kind) params.set("type", filters.kind);
  if (filters.period) params.set("period", filters.period);
  return params;
};

const fold = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr");

/** Filtres combinés en ET ; plusieurs catégories se combinent en OU. */
export const filterFixedRows = (rows, filters) =>
  rows.filter(
    (row) =>
      (!filters.title || fold(row.titre).includes(fold(filters.title))) &&
      (!filters.categoryIds.length ||
        filters.categoryIds.includes(fixedCategoryKey(row))) &&
      (!filters.kind || row.kind === filters.kind) &&
      (!filters.period || row.periodicite === filters.period)
  );

/** Remplace l'état connu dans l'URL sans toucher aux autres paramètres. */
export const mergeSearch = (search, managed, params) => {
  const next = new URLSearchParams(search);
  for (const name of managed) next.delete(name);
  for (const [name, value] of params) next.append(name, value);
  return next;
};

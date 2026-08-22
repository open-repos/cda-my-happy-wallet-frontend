export type OperationType = "DEPENSE" | "ENTREE";

export interface OneOffOperation {
  id: number;
  title: string;
  amount: string;
  currency: string;
  type: OperationType;
  operationDate: string;
  categoryId: number;
}

export interface OperationCategory {
  id: number;
  name: string;
  color: string | null;
}

export interface PaginationMeta {
  limit: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export interface CollectionPage<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface OperationDraft {
  title: string;
  amount: string;
  operationDate: string;
  categoryId: number | null;
  kind: OperationType;
}

export type OperationDraftErrors = Partial<
  Record<keyof OperationDraft, string>
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCalendarDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match == null) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() + 1 === Number(match[2]) &&
    date.getUTCDate() === Number(match[3])
  );
};

export const parseOperation = (value: unknown): OneOffOperation => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    typeof value.title !== "string" ||
    value.title.length < 2 ||
    value.title.length > 50 ||
    typeof value.amount !== "string" ||
    !/^(0|[1-9]\d{0,7})(?:\.\d{2})$/.test(value.amount) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    (value.type !== "DEPENSE" && value.type !== "ENTREE") ||
    typeof value.operationDate !== "string" ||
    !isCalendarDate(value.operationDate) ||
    !Number.isInteger(value.categoryId) ||
    Number(value.categoryId) <= 0
  ) {
    throw new Error("Invalid operation response");
  }

  return {
    id: Number(value.id),
    title: value.title,
    amount: value.amount,
    currency: value.currency,
    type: value.type,
    operationDate: value.operationDate,
    categoryId: Number(value.categoryId),
  };
};

export const parseCategory = (value: unknown): OperationCategory => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    typeof value.name !== "string" ||
    value.name.length < 2 ||
    value.name.length > 50 ||
    (value.color !== null &&
      (typeof value.color !== "string" || !/^#[0-9A-F]{6}$/i.test(value.color)))
  ) {
    throw new Error("Invalid category response");
  }

  return {
    id: Number(value.id),
    name: value.name,
    color: value.color,
  };
};

export const parseCollectionPage = <T>(
  value: unknown,
  parseItem: (item: unknown) => T,
): CollectionPage<T> => {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    throw new Error("Invalid collection response");
  }
  const { meta } = value;
  if (
    !Number.isInteger(meta.limit) ||
    Number(meta.limit) <= 0 ||
    typeof meta.hasNext !== "boolean" ||
    (meta.nextCursor !== null && typeof meta.nextCursor !== "string") ||
    (meta.hasNext &&
      (typeof meta.nextCursor !== "string" || meta.nextCursor.length === 0))
  ) {
    throw new Error("Invalid collection response");
  }

  return {
    data: value.data.map(parseItem),
    meta: {
      limit: Number(meta.limit),
      hasNext: meta.hasNext,
      nextCursor: meta.nextCursor,
    },
  };
};

export const validateOperationDraft = (
  draft: OperationDraft,
  categoryIds: ReadonlySet<number>,
): OperationDraftErrors => {
  const errors: OperationDraftErrors = {};
  const title = draft.title.trim();
  if (title.length < 2 || title.length > 50) {
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  }

  const amount = draft.amount.replace(",", ".");
  if (!/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    errors.amount = "Saisissez un montant positif avec deux décimales maximum.";
  }
  if (!isCalendarDate(draft.operationDate)) {
    errors.operationDate = "Utilisez une date valide au format AAAA-MM-JJ.";
  }
  if (draft.categoryId == null || !categoryIds.has(draft.categoryId)) {
    errors.categoryId = "Choisissez une catégorie.";
  }
  return errors;
};

export const toOperationPayload = (draft: OperationDraft) => ({
  title: draft.title.trim(),
  amount: Number(draft.amount.replace(",", ".")).toFixed(2),
  currency: "EUR",
  kind: draft.kind,
  operationDate: draft.operationDate,
  categoryId: draft.categoryId as number,
});

import {
  CollectionPage,
  OperationCategory,
  PaginationMeta,
  parseCategory,
} from "@/src/features/operations/domain/oneOffOperation";

export type FixedOperationType = "CHARGE" | "REVENU";

export interface FixedOperation {
  id: number;
  title: string;
  amount: string;
  currency: string;
  type: FixedOperationType;
  /** Catégorie principale facultative (#385, contrat Web #266). */
  categoryId: number | null;
  /** Objet relu du backend ; `null` si absent malgré `categoryId`. */
  category: OperationCategory | null;
}

export type FixedCategoryAssignment = Pick<
  FixedOperation,
  "categoryId" | "category"
>;

export interface FixedOperationDraft {
  title: string;
  amount: string;
  type: FixedOperationType;
  categoryId: number | null;
}

export type FixedOperationDraftErrors = Partial<
  Record<keyof FixedOperationDraft, string>
>;

export interface BudgetSummary {
  expenses: number;
  income: number;
  remaining: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const FIXED_CATEGORY_UNAVAILABLE_MESSAGE =
  "Cette catégorie n’est plus disponible. Choisissez-en une autre.";

const isCategoryId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

const parseCategoryAssignment = (
  value: Record<string, unknown>,
): FixedCategoryAssignment => {
  if (value.categoryId != null && !isCategoryId(value.categoryId)) {
    throw new Error("Invalid fixed operation response");
  }
  const category =
    value.category == null ? null : parseCategory(value.category);
  return {
    categoryId: isCategoryId(value.categoryId)
      ? value.categoryId
      : (category?.id ?? null),
    category,
  };
};

export const parseFixedOperation = (value: unknown): FixedOperation => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.idOperationFixe) ||
    Number(value.idOperationFixe) <= 0 ||
    typeof value.titre !== "string" ||
    value.titre.length < 2 ||
    value.titre.length > 50 ||
    typeof value.montant !== "string" ||
    !/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value.montant) ||
    typeof value.devise !== "string" ||
    !/^[A-Z]{3}$/.test(value.devise) ||
    (value.typeOperation !== "CHARGE" && value.typeOperation !== "REVENU")
  ) {
    throw new Error("Invalid fixed operation response");
  }

  return {
    id: Number(value.idOperationFixe),
    title: value.titre,
    amount: value.montant,
    currency: value.devise,
    type: value.typeOperation,
    ...parseCategoryAssignment(value),
  };
};

/** Libellé affiché, identique au Web (`fixedCategory`). */
export const fixedCategoryLabel = ({
  categoryId,
  category,
}: FixedCategoryAssignment): string =>
  category?.name ??
  (categoryId == null ? "Non catégorisé" : "Catégorie indisponible");

/** `fixedKind` restreint au type ; son absence convient aux deux types. */
export const compatibleFixedCategories = <T extends OperationCategory>(
  categories: readonly T[],
  type: FixedOperationType,
): T[] =>
  categories.filter(({ fixedKind }) => fixedKind == null || fixedKind === type);

/**
 * Choix proposés au formulaire : la catégorie actuelle reste visible et
 * sélectionnée même si le catalogue ne la propose plus.
 */
export const fixedCategoryOptions = (
  categories: readonly OperationCategory[],
  type: FixedOperationType,
  current: FixedCategoryAssignment | null,
): OperationCategory[] => {
  const options = compatibleFixedCategories(categories, type);
  const kept = current?.category;
  return kept != null && !options.some(({ id }) => id === kept.id)
    ? [kept, ...options]
    : options;
};

interface CategoryCatalog {
  /** Catégories compatibles chargées ; `null` si le catalogue est indisponible. */
  available: readonly OperationCategory[] | null;
  current: Pick<FixedCategoryAssignment, "categoryId"> | null;
}

export const validateFixedOperationDraft = (
  draft: FixedOperationDraft,
  catalog?: CategoryCatalog,
): FixedOperationDraftErrors => {
  const errors: FixedOperationDraftErrors = {};
  const title = draft.title.trim();
  if (title.length < 2 || title.length > 50) {
    errors.title = "Le libellé doit contenir entre 2 et 50 caractères.";
  }

  const normalizedAmount = draft.amount.replace(",", ".");
  if (
    !/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(normalizedAmount) ||
    Number(normalizedAmount) < 1
  ) {
    errors.amount =
      "Saisissez un montant d’au moins 1 € avec deux décimales maximum.";
  }

  // Seul un nouveau choix est contrôlé : l'affectation existante reste
  // conservée, même si le catalogue ne la propose plus.
  const changed = draft.categoryId !== (catalog?.current?.categoryId ?? null);
  if (
    changed &&
    draft.categoryId != null &&
    catalog?.available != null &&
    !catalog.available.some(({ id }) => id === draft.categoryId)
  ) {
    errors.categoryId = FIXED_CATEGORY_UNAVAILABLE_MESSAGE;
  }
  return errors;
};

/**
 * Corps POST/PUT. Le PUT backend est partiel : `categoryId` n'est envoyé que
 * s'il change (`null` retire l'affectation), ce qui conserve aussi la
 * périodicité et la part personnelle saisies sur le Web.
 */
export const toFixedOperationPayload = (
  draft: FixedOperationDraft,
  current?: Pick<FixedCategoryAssignment, "categoryId">,
) => {
  const previous = current?.categoryId ?? null;
  return {
    titre: draft.title.trim(),
    montant: Number(draft.amount.replace(",", ".")).toFixed(2),
    devise: "EUR",
    ...(draft.categoryId === previous ? {} : { categoryId: draft.categoryId }),
  };
};

export const parseFixedOperationPage = (
  value: unknown,
): CollectionPage<FixedOperation> => {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    throw new Error("Invalid fixed operation collection");
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
    throw new Error("Invalid fixed operation collection");
  }

  const pagination: PaginationMeta = {
    limit: Number(meta.limit),
    hasNext: meta.hasNext,
    nextCursor: meta.nextCursor,
  };
  return { data: value.data.map(parseFixedOperation), meta: pagination };
};

const amountInCents = (amount: string): number =>
  Math.round(Number(amount) * 100);

export const summarizeFixedBudget = (
  operations: readonly FixedOperation[],
): BudgetSummary => {
  const totals = operations.reduce(
    (summary, operation) => {
      const amount = amountInCents(operation.amount);
      if (operation.type === "REVENU") summary.income += amount;
      else summary.expenses += amount;
      return summary;
    },
    { expenses: 0, income: 0 },
  );

  return {
    expenses: totals.expenses / 100,
    income: totals.income / 100,
    remaining: (totals.income - totals.expenses) / 100,
  };
};

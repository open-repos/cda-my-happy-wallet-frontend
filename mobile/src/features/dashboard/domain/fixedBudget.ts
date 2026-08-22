import {
  CollectionPage,
  PaginationMeta,
} from "@/src/features/operations/domain/oneOffOperation";

export type FixedOperationType = "CHARGE" | "REVENU";

export interface FixedOperation {
  id: number;
  title: string;
  amount: string;
  currency: string;
  type: FixedOperationType;
}

export interface FixedOperationDraft {
  title: string;
  amount: string;
  type: FixedOperationType;
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
  };
};

export const validateFixedOperationDraft = (
  draft: FixedOperationDraft,
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
  return errors;
};

export const toFixedOperationPayload = (draft: FixedOperationDraft) => ({
  titre: draft.title.trim(),
  montant: Number(draft.amount.replace(",", ".")).toFixed(2),
  devise: "EUR",
});

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

import { apiPrivate } from "../../utils/axiosHelper";
import { parseAcknowledgedWrite } from "../utils/acknowledgedWrite";

const invalid = () => {
  throw new Error("Invalid savings API response");
};
const id = (value) => Number.isSafeInteger(value) && value > 0;
const cents = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 9999999999;
const currency = (value) =>
  typeof value === "string" && /^[A-Z]{3}$/.test(value);
export const isSavingsDate = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= "1000-01-01" &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const parseSavingsAccount = (value) => {
  if (
    !id(value?.id) ||
    typeof value.name !== "string" ||
    value.name.trim().length < 2 ||
    [...value.name].length > 50 ||
    !currency(value.currency) ||
    !cents(value.initialBalanceMinorUnits) ||
    !cents(value.balanceMinorUnits) ||
    typeof value.archived !== "boolean" ||
    !(value.goalId === null || id(value.goalId))
  )
    invalid();
  const {
    id: accountId,
    name,
    currency: code,
    initialBalanceMinorUnits,
    balanceMinorUnits,
    archived,
    goalId,
  } = value;
  return {
    id: accountId,
    name,
    currency: code,
    initialBalanceMinorUnits,
    balanceMinorUnits,
    archived,
    goalId,
  };
};
export const parseSavingsMovement = (value) => {
  if (
    !id(value?.id) ||
    !id(value.accountId) ||
    !currency(value.currency) ||
    value.type !== "VIREMENT" ||
    !["TO_SAVINGS", "FROM_SAVINGS"].includes(value.direction) ||
    !cents(value.amountMinorUnits) ||
    value.amountMinorUnits === 0 ||
    !isSavingsDate(value.operationDate) ||
    !["MANUAL", "GOAL", "MONTH_END", "NEGATIVE_COVERAGE"].includes(
      value.reason
    ) ||
    typeof value.idempotencyKey !== "string" ||
    !(
      value.monthEndRevision === undefined ||
      value.monthEndRevision === null ||
      id(value.monthEndRevision)
    ) ||
    !(
      value.isCompensation === undefined ||
      typeof value.isCompensation === "boolean"
    )
  )
    invalid();
  const {
    id: movementId,
    accountId,
    currency: code,
    type,
    direction,
    amountMinorUnits,
    operationDate,
    reason,
    idempotencyKey,
  } = value;
  return {
    id: movementId,
    accountId,
    currency: code,
    type,
    direction,
    amountMinorUnits,
    operationDate,
    reason,
    idempotencyKey,
    // Décision de fin de mois (#184) : révision liée et compensation.
    monthEndRevision: value.monthEndRevision ?? null,
    isCompensation: value.isCompensation ?? false,
  };
};
export const parseCurrentAccount = (value) => {
  if (
    value?.type !== "CURRENT" ||
    value.balanceBasis !== "AVAILABLE_BUDGET" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month || "") ||
    !currency(value.currency) ||
    !Number.isSafeInteger(value.balanceMinorUnits) ||
    ![
      "baseMinorUnits",
      "carryInMinorUnits",
      "actualIncomeMinorUnits",
      "actualExpenseMinorUnits",
    ].every((key) => Number.isSafeInteger(value.budget?.[key]))
  )
    invalid();
  return {
    type: value.type,
    month: value.month,
    currency: value.currency,
    balanceMinorUnits: value.balanceMinorUnits,
    balanceBasis: value.balanceBasis,
    budget: Object.fromEntries(
      [
        "baseMinorUnits",
        "carryInMinorUnits",
        "actualIncomeMinorUnits",
        "actualExpenseMinorUnits",
      ].map((key) => [key, value.budget[key]])
    ),
  };
};
export const parseCurrentMovement = (value) => {
  if (
    !id(value?.id) ||
    !["OPERATION", "VIREMENT", "EXCEPTIONAL_INCOME"].includes(value.source) ||
    (value.source === "EXCEPTIONAL_INCOME" &&
      (value.kind !== "ENTREE" || value.accountId !== null)) ||
    !["DEPENSE", "ENTREE", "VIREMENT"].includes(value.kind) ||
    typeof value.title !== "string" ||
    !Number.isSafeInteger(value.signedAmountMinorUnits) ||
    !isSavingsDate(value.operationDate) ||
    !currency(value.currency) ||
    !(value.accountId === null || id(value.accountId))
  )
    invalid();
  const {
    id: movementId,
    source,
    kind,
    title,
    signedAmountMinorUnits,
    operationDate,
    currency: code,
    accountId,
  } = value;
  return {
    id: movementId,
    source,
    kind,
    title,
    signedAmountMinorUnits,
    operationDate,
    currency: code,
    accountId,
  };
};
export const parseSavingsOccurrence = (value) => {
  if (
    !id(value?.accountId) ||
    !id(value.goalId) ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month || "") ||
    !isSavingsDate(value.operationDate) ||
    typeof value.title !== "string" ||
    !cents(value.amountMinorUnits) ||
    value.amountMinorUnits === 0 ||
    !currency(value.currency)
  )
    invalid();
  const { accountId, goalId, month, operationDate, title, amountMinorUnits } =
    value;
  return {
    accountId,
    goalId,
    month,
    operationDate,
    title,
    amountMinorUnits,
    currency: value.currency,
  };
};
const parseOccurrenceResolution = (value) => {
  if (
    !["CONFIRMED", "CANCELED"].includes(value?.status) ||
    (value.status === "CONFIRMED") === (value.movement === null)
  )
    invalid();
  return {
    status: value.status,
    movement:
      value.movement === null ? null : parseSavingsMovement(value.movement),
  };
};
export const parseSavingsPage = (value, parse) => {
  const meta = value?.meta;
  if (
    !Array.isArray(value?.data) ||
    !Number.isInteger(meta?.limit) ||
    meta.limit < 1 ||
    meta.limit > 100 ||
    typeof meta.hasNext !== "boolean" ||
    !(meta.nextCursor === null || typeof meta.nextCursor === "string") ||
    (meta.hasNext ? !meta.nextCursor : meta.nextCursor !== null)
  )
    invalid();
  return {
    data: value.data.map(parse),
    meta: {
      limit: meta.limit,
      hasNext: meta.hasNext,
      nextCursor: meta.nextCursor,
    },
  };
};
const get = async (path, params) =>
  (await apiPrivate.get(path, { params, withCredentials: true })).data;
const page = async (path, params, cursor, parse) =>
  parseSavingsPage(
    await get(path, { ...params, limit: 20, ...(cursor ? { cursor } : {}) }),
    parse
  );
const write = async (method, path, body, parse) =>
  parseAcknowledgedWrite(
    parse,
    (await apiPrivate[method](path, body, { withCredentials: true })).data?.data
  );
export const savingsService = {
  accounts: (_, cursor = null) =>
    page("/savings-accounts", {}, cursor, parseSavingsAccount),
  account: async ({ accountId }) =>
    parseSavingsAccount((await get(`/savings-accounts/${accountId}`)).data),
  current: async (params) =>
    parseCurrentAccount((await get("/accounts/current", params)).data),
  movements: ({ accountId }, cursor = null) =>
    page(
      `/savings-accounts/${accountId}/movements`,
      {},
      cursor,
      parseSavingsMovement
    ),
  currentMovements: (params, cursor = null) =>
    page("/accounts/current/movements", params, cursor, parseCurrentMovement),
  create: ({ name, currency, initialBalanceMinorUnits }) =>
    write(
      "post",
      "/savings-accounts",
      { name, currency, initialBalanceMinorUnits },
      parseSavingsAccount
    ),
  rename: (accountId, name) =>
    write(
      "patch",
      `/savings-accounts/${accountId}`,
      { name },
      parseSavingsAccount
    ),
  archive: (accountId) =>
    write(
      "patch",
      `/savings-accounts/${accountId}`,
      { archived: true },
      parseSavingsAccount
    ),
  linkGoal: (accountId, goalId) =>
    write(
      "put",
      `/savings-accounts/${accountId}/goal`,
      { goalId },
      parseSavingsAccount
    ),
  pendingOccurrences: (params, cursor = null) =>
    page(
      "/savings-occurrences/pending",
      params,
      cursor,
      parseSavingsOccurrence
    ),
  /** Confirme une seule fois ou refuse le versement mensuel prévu. */
  resolveOccurrence: (accountId, month, status) =>
    write(
      "put",
      `/savings-accounts/${accountId}/occurrences/${month}`,
      { status },
      parseOccurrenceResolution
    ),
  transfer: (
    accountId,
    { direction, amountMinorUnits, operationDate, idempotencyKey }
  ) =>
    write(
      "post",
      `/savings-accounts/${accountId}/transfers`,
      {
        direction,
        amountMinorUnits,
        operationDate,
        reason: "MANUAL",
        idempotencyKey,
      },
      parseSavingsMovement
    ),
};
const errors = {
  INSUFFICIENT_SAVINGS: "Le solde de ce compte ne suffit pas pour ce retrait.",
  ACCOUNT_ARCHIVED:
    "Ce compte est archivé. Actualisez le Coffre pour consulter son état.",
  GOAL_ALREADY_LINKED:
    "Ce compte ou cet objectif est déjà rattaché. Actualisez les données.",
  CURRENCY_MISMATCH: "Le compte et l’objectif doivent avoir la même devise.",
  OPENING_BALANCE_CONFLICT:
    "Cet objectif possède déjà une épargne. Rattachez-le à un compte vierge, sans solde initial ni mouvement.",
  IDEMPOTENCY_CONFLICT:
    "Cette tentative correspond à un autre virement. Vérifiez l’historique avant toute nouvelle opération.",
  BALANCE_LIMIT: "Le solde maximal autorisé serait dépassé.",
  LINKED_GOAL_BALANCE_READ_ONLY:
    "L’épargne de cet objectif suit son compte. Actualisez les données avant de modifier ses autres paramètres.",
  NOT_FOUND:
    "Ce compte ou cet objectif n’est plus disponible. Actualisez le Coffre.",
  INVALID_DATE: "Choisissez une date valide, au plus tard aujourd’hui.",
  INVALID_AMOUNT:
    "Saisissez un montant strictement positif avec au plus deux décimales.",
};
export const savingsErrorMessage = (
  error,
  fallback = "Impossible de charger le Coffre. Vérifiez votre connexion puis réessayez."
) => errors[error?.response?.data?.error?.details?.code] || fallback;

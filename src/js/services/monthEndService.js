import { apiPrivate } from "../../utils/axiosHelper";
import { parseAcknowledgedWrite } from "../utils/acknowledgedWrite";

/** Contrat `GET/PUT /budget-periods/:month/decision` (backend #184). */
const MAX_CENTS = 9999999999;
const invalid = () => {
  throw new Error("Invalid month-end decision response");
};
const id = (value) => Number.isSafeInteger(value) && value > 0;
const cents = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= MAX_CENTS;
const signed = (value) => Number.isSafeInteger(value);
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");

const parseAllocations = (value) => {
  if (!Array.isArray(value) || value.length > 100) invalid();
  return value.map((row) => {
    if (!id(row?.accountId) || !cents(row.amountMinorUnits)) return invalid();
    if (row.amountMinorUnits === 0) return invalid();
    return { accountId: row.accountId, amountMinorUnits: row.amountMinorUnits };
  });
};

export const parseMonthEndDecision = (value) => {
  if (
    !isMonth(value?.month) ||
    !/^[A-Z]{3}$/.test(value.currency || "") ||
    !["PENDING", "DECIDED"].includes(value.status) ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    ![
      value.savingsMinorUnits,
      value.coverageMinorUnits,
      value.exceptionalIncomeMinorUnits,
    ].every(cents) ||
    ![
      value.resultBeforeDecisionMinorUnits,
      value.referenceResultMinorUnits,
      value.carryMinorUnits,
      value.correctionDeltaMinorUnits,
    ].every(signed) ||
    typeof value.requiresReview !== "boolean"
  )
    invalid();
  return {
    month: value.month,
    currency: value.currency,
    status: value.status,
    revision: value.revision,
    savings: parseAllocations(value.savings),
    coverage: parseAllocations(value.coverage),
    exceptionalIncomeMinorUnits: value.exceptionalIncomeMinorUnits,
    savingsMinorUnits: value.savingsMinorUnits,
    coverageMinorUnits: value.coverageMinorUnits,
    resultBeforeDecisionMinorUnits: value.resultBeforeDecisionMinorUnits,
    referenceResultMinorUnits: value.referenceResultMinorUnits,
    carryMinorUnits: value.carryMinorUnits,
    requiresReview: value.requiresReview,
    correctionDeltaMinorUnits: value.correctionDeltaMinorUnits,
  };
};

const allocationBody = (rows) =>
  rows.map(({ accountId, amountMinorUnits }) => ({
    accountId,
    amountMinorUnits,
  }));

export const monthEndService = {
  async get(month, currency = "EUR") {
    const response = await apiPrivate.get(`/budget-periods/${month}/decision`, {
      params: { currency },
      withCredentials: true,
    });
    return parseMonthEndDecision(response.data?.data);
  },
  /** Remplace intégralement la décision ; une réponse rejouée reste historique. */
  async save(
    month,
    {
      expectedRevision,
      idempotencyKey,
      savings,
      coverage,
      exceptionalIncomeMinorUnits,
    },
    currency = "EUR"
  ) {
    const response = await apiPrivate.put(
      `/budget-periods/${month}/decision`,
      {
        expectedRevision,
        idempotencyKey,
        savings: allocationBody(savings),
        coverage: allocationBody(coverage),
        exceptionalIncomeMinorUnits,
      },
      { params: { currency }, withCredentials: true }
    );
    return parseAcknowledgedWrite(parseMonthEndDecision, response.data?.data);
  },
};

const messages = {
  PERIOD_NOT_CLOSED:
    "Ce mois n’est pas encore terminé. La décision sera proposée le premier jour du mois suivant.",
  REVISION_CONFLICT:
    "La décision a changé sur un autre appareil. La version la plus récente est affichée : vérifiez-la avant de valider à nouveau.",
  IDEMPOTENCY_CONFLICT:
    "Cette tentative correspond à une autre décision. Actualisez la page avant de valider à nouveau.",
  INSUFFICIENT_SAVINGS:
    "Un compte d’épargne ne contient pas assez d’argent pour ce prélèvement ou cette correction.",
  ACCOUNT_ARCHIVED:
    "Un compte archivé ne peut plus recevoir de nouvelle épargne. Vous pouvez conserver ou réduire son montant.",
  CURRENCY_MISMATCH: "Un compte choisi n’utilise pas la devise de ce budget.",
  BALANCE_LIMIT: "Le solde maximal autorisé d’un compte serait dépassé.",
  ALLOCATION_EXCEEDS_RESULT:
    "La répartition dépasse le solde du mois. Réduisez un montant.",
  INVALID_ALLOCATION:
    "Un excédent ne peut être qu’épargné et un déficit ne peut être que couvert. Actualisez la page.",
  NOT_FOUND: "Un compte choisi n’est plus disponible. Actualisez la page.",
};

/** Code métier stable de `error.details.code`, ou `null`. */
export const monthEndErrorCode = (error) => {
  const code = error?.response?.data?.error?.details?.code;
  return Object.hasOwn(messages, code) ? code : null;
};

export const monthEndErrorMessage = (
  error,
  fallback = "La décision de fin de mois n’a pas pu être chargée. Vérifiez votre connexion puis réessayez."
) => messages[monthEndErrorCode(error)] ?? fallback;

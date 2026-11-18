import { parseHundredths } from "./decimalInput";
import { savingsMoney } from "../components/Savings/savingsFormat";

/**
 * Règles d'interface de la décision de fin de mois (#396). Le serveur reste
 * l'autorité : ces fonctions préparent la saisie et l'aperçu, en centimes
 * entiers, avec la formule validée
 * report = solde avant décision − épargne + prélèvements + entrée exceptionnelle.
 */
const parisMonth = (now) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(now);

export const shiftMonth = (month, offset) => {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
  const next = index + offset;
  return `${String(Math.floor(next / 12)).padStart(4, "0")}-${String(
    (next % 12) + 1
  ).padStart(2, "0")}`;
};

/** Mois clos le plus récent, selon la date civile `Europe/Paris`. */
export const previousParisMonth = (now = new Date()) =>
  shiftMonth(parisMonth(now), -1);

const total = (rows) =>
  rows.reduce((sum, row) => sum + row.amountMinorUnits, 0);

export const previewCarry = (result, plan) =>
  result -
  total(plan.savings) +
  total(plan.coverage) +
  plan.exceptionalIncomeMinorUnits;

/** Report connu au moment de la décision, avant la correction signalée. */
export const carryBeforeCorrection = (decision) =>
  decision.carryMinorUnits - decision.correctionDeltaMinorUnits;

/**
 * « Garder ma décision » n'est possible que si la répartition reste valide
 * pour le nouveau solde (même sens, plafond respecté).
 */
export const canKeepDecision = (decision) => {
  const result = decision.resultBeforeDecisionMinorUnits;
  const covered =
    decision.coverageMinorUnits + decision.exceptionalIncomeMinorUnits;
  if (result > 0) return covered === 0 && decision.savingsMinorUnits <= result;
  if (result < 0) return decision.savingsMinorUnits === 0 && covered <= -result;
  return decision.savingsMinorUnits === 0 && covered === 0;
};

/** Une décision n'est proposée que pour un solde non nul encore en attente. */
export const needsDecision = (decision) =>
  decision?.status === "PENDING" &&
  decision.resultBeforeDecisionMinorUnits !== 0;

export const decisionMode = (decision) => {
  const result = decision.resultBeforeDecisionMinorUnits;
  if (result < 0)
    return decision.coverageMinorUnits + decision.exceptionalIncomeMinorUnits >
      0
      ? "cover"
      : "carry";
  if (decision.savingsMinorUnits === 0) return "carry";
  return decision.savingsMinorUnits === result ? "all" : "split";
};

export const centsInput = (value) =>
  value > 0 ? (value / 100).toFixed(2).replace(".", ",") : "";

export const draftFromDecision = (decision) => ({
  mode: decisionMode(decision),
  // Si une correction a inversé le signe, l'ancien sens n'est pas repris.
  amounts: Object.fromEntries(
    (decision.resultBeforeDecisionMinorUnits < 0
      ? decision.coverage
      : decision.savings
    ).map((row) => [row.accountId, centsInput(row.amountMinorUnits)])
  ),
  exceptional: centsInput(decision.exceptionalIncomeMinorUnits),
});

const INVALID_AMOUNT = "Saisissez un montant positif, par exemple 50,00.";
const readAmount = (raw) => {
  if (raw === undefined || String(raw).trim() === "") return 0;
  const value = parseHundredths(raw);
  return value === null || value > 9999999999 ? null : value;
};

/**
 * Transforme la saisie en corps de requête. `decision` (révision) autorise à
 * conserver un prélèvement déjà effectué sur un compte.
 */
export const buildDecisionPlan = ({
  result,
  draft,
  accounts,
  decision = null,
  currency = "EUR",
}) => {
  const plan = { savings: [], coverage: [], exceptionalIncomeMinorUnits: 0 };
  const errors = [];
  const fieldErrors = {};
  if (draft.mode === "carry") return { plan, errors, fieldErrors };
  const deficit = result < 0;
  const money = (value) => savingsMoney(value, currency);
  const target = deficit ? plan.coverage : plan.savings;
  for (const account of accounts) {
    const amount = readAmount(draft.amounts[account.id]);
    if (amount === null) {
      fieldErrors[account.id] = INVALID_AMOUNT;
      continue;
    }
    if (amount === 0) continue;
    if (deficit) {
      const previous =
        decision?.coverage.find((row) => row.accountId === account.id)
          ?.amountMinorUnits ?? 0;
      const available = account.balanceMinorUnits + previous;
      if (amount > available) {
        fieldErrors[account.id] = `Fonds insuffisants : ${
          account.name
        } contient ${money(available)}.`;
        continue;
      }
    }
    target.push({ accountId: account.id, amountMinorUnits: amount });
  }
  if (deficit) {
    const exceptional = readAmount(draft.exceptional);
    if (exceptional === null) fieldErrors.exceptional = INVALID_AMOUNT;
    else plan.exceptionalIncomeMinorUnits = exceptional;
  }
  const named = (key) =>
    key === "exceptional"
      ? "Entrée exceptionnelle"
      : accounts.find((account) => String(account.id) === String(key))?.name;
  Object.entries(fieldErrors).forEach(([key, message]) =>
    errors.push(`${named(key)} : ${message}`)
  );
  if (errors.length) return { plan, errors, fieldErrors };
  if (deficit) {
    const covered = total(plan.coverage) + plan.exceptionalIncomeMinorUnits;
    if (covered > -result)
      errors.push(
        `La couverture (${money(covered)}) dépasse le déficit (${money(
          -result
        )}). Réduisez un montant.`
      );
    else if (covered === 0)
      errors.push(
        "Indiquez au moins un prélèvement ou une entrée exceptionnelle, ou choisissez « Tout reporter »."
      );
  } else {
    const saved = total(plan.savings);
    if (saved > result)
      errors.push(
        `L’épargne (${money(saved)}) dépasse le disponible (${money(
          result
        )}). Réduisez un montant.`
      );
    else if (draft.mode === "all" && saved < result)
      errors.push(
        `Pour tout épargner, répartissez encore ${money(
          result - saved
        )}, ou choisissez « Répartir ».`
      );
    else if (saved === 0)
      errors.push(
        "Indiquez un montant à épargner, ou choisissez « Tout reporter »."
      );
  }
  return { plan, errors, fieldErrors };
};

const randomPart = () =>
  globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 16) ??
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** Clé d'idempotence d'une tentative ; elle est conservée pour la reprendre. */
export const newDecisionKey = (month) => `decision-${month}-${randomPart()}`;

const decimal = (cents) => {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(
    absolute % 100
  ).padStart(2, "0")}`;
};

/**
 * Lignes « dont » du report entrant dans le détail du calcul (#392) : elles
 * expliquent le report sans s'ajouter une seconde fois à la cascade.
 */
export const carryDecisionDetails = (decision) => {
  if (!decision || decision.status !== "DECIDED") return [];
  const result = decision.resultBeforeDecisionMinorUnits;
  const rows = [
    {
      key: "available",
      label:
        result < 0
          ? "dont déficit avant décision"
          : "dont disponible avant décision",
      amount: decimal(result),
    },
  ];
  if (decision.savingsMinorUnits > 0)
    rows.push({
      key: "savings",
      label: "dont épargné en fin de mois",
      amount: decimal(-decision.savingsMinorUnits),
    });
  if (decision.coverageMinorUnits > 0)
    rows.push({
      key: "coverage",
      label: "dont prélèvements d’épargne",
      amount: decimal(decision.coverageMinorUnits),
    });
  if (decision.exceptionalIncomeMinorUnits > 0)
    rows.push({
      key: "exceptional",
      label: "dont entrée exceptionnelle",
      amount: decimal(decision.exceptionalIncomeMinorUnits),
    });
  return rows;
};

import { CollectionPage } from "@/src/features/operations/domain/oneOffOperation";
import {
  DecisionPlan,
  monthEndErrorMessage,
} from "@/src/features/month-end/domain/monthEnd";
import { WriteOutcome } from "@/src/features/vault/domain/vaultWrite";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Clé d'idempotence d'une tentative de décision (#420). Comme pour les
 * virements (#419), le moteur natif n'expose pas `crypto.randomUUID` :
 * l'instant et 20 caractères aléatoires suffisent, une collision étant
 * refusée par le serveur (`IDEMPOTENCY_CONFLICT`) sans doublon.
 */
export const createDecisionKey = (month: string) =>
  `decision-${month}-${Date.now().toString(36)}-${Array.from(
    { length: 20 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("")}`;

export interface DecisionRequest {
  month: string;
  currency: string;
  expectedRevision: number;
  plan: DecisionPlan;
}

export interface DecisionAttempt {
  signature: string;
  key: string;
}

/**
 * Tentative à envoyer : la clé d'une tentative incertaine est reprise tant
 * que le mois, la devise, la révision attendue et la répartition sont
 * identiques ; le serveur rejoue alors la réponse d'origine.
 */
export const nextDecisionAttempt = (
  previous: DecisionAttempt | null,
  request: DecisionRequest,
  createKey: (month: string) => string = createDecisionKey,
): DecisionAttempt => {
  const signature = JSON.stringify([
    request.month,
    request.currency,
    request.expectedRevision,
    request.plan,
  ]);
  return previous?.signature === signature
    ? previous
    : { signature, key: createKey(request.month) };
};

/**
 * Après l'envoi : une réponse incertaine garde la tentative. Pendant une
 * reprise, seul un refus métier connu la libère, car un refus sans code
 * (proxy, délai) ne dit rien du premier envoi.
 */
export const settleDecisionAttempt = (
  attempt: DecisionAttempt,
  outcome: WriteOutcome,
  retrying = false,
): DecisionAttempt | null => {
  if (outcome.status === "uncertain") return attempt;
  if (outcome.status === "refused" && retrying && outcome.code === null) {
    return attempt;
  }
  return null;
};

export const describeDecisionFailure = (
  outcome: Exclude<WriteOutcome, { status: "saved" }>,
) =>
  outcome.status === "uncertain"
    ? "Le résultat de l’enregistrement est incertain. Vos montants sont conservés : vérifiez la décision, puis reprenez la même tentative, sans doublon."
    : monthEndErrorMessage(
        outcome.code,
        "La décision n’a pas été enregistrée. Vérifiez les montants puis réessayez.",
      );

export const MAX_ACCOUNT_PAGES = 10;

/**
 * Tous les comptes du Coffre (une décision porte au plus 100 allocations) :
 * curseur opaque suivi, lignes dédoublonnées, curseur répété refusé.
 */
export const loadAllSavingsAccounts = async <T extends { id: number }>(
  loadPage: (cursor: string | null) => Promise<CollectionPage<T>>,
): Promise<T[]> => {
  const rows: T[] = [];
  const ids = new Set<number>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  for (let page = 0; page < MAX_ACCOUNT_PAGES; page += 1) {
    const result: CollectionPage<T> = await loadPage(cursor);
    for (const row of result.data) {
      if (!ids.has(row.id)) {
        ids.add(row.id);
        rows.push(row);
      }
    }
    cursor = result.meta.hasNext ? result.meta.nextCursor : null;
    if (cursor === null) return rows;
    if (cursors.has(cursor)) throw new Error("Repeated savings cursor");
    cursors.add(cursor);
  }
  throw new Error("Too many savings account pages");
};

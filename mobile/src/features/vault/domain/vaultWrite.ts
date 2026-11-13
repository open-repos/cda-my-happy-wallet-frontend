import {
  TransferAttempt,
  TransferDraft,
  validateTransferDraft,
  vaultErrorMessage,
} from "@/src/features/vault/domain/vault";

/**
 * Issue d'une écriture du Coffre (#419). « saved » : le serveur a répondu
 * oui, l'écriture ne sera jamais rejouée ; `refreshed` dit seulement si
 * l'affichage a pu être relu. « uncertain » : réponse perdue ou erreur
 * serveur, l'écriture a peut-être eu lieu.
 */
export type WriteOutcome =
  | { status: "saved"; refreshed: boolean }
  | { status: "refused"; code: string | null }
  | { status: "uncertain" };

const refusalOf = (error: unknown) => {
  if (typeof error !== "object" || error === null) return null;
  const { status, code } = error as { status?: unknown; code?: unknown };
  return typeof status === "number" && status < 500
    ? { code: typeof code === "string" ? code : null }
    : null;
};

export const runVaultWrite = async (
  write: () => Promise<unknown>,
  refresh: () => Promise<boolean>,
): Promise<WriteOutcome> => {
  try {
    await write();
  } catch (error) {
    const refusal = refusalOf(error);
    return refusal === null
      ? { status: "uncertain" }
      : { status: "refused", code: refusal.code };
  }
  // La relecture est une phase à part : son échec ne rouvre pas l'écriture.
  try {
    return { status: "saved", refreshed: (await refresh()) !== false };
  } catch {
    return { status: "saved", refreshed: false };
  }
};

export const UNREFRESHED_MESSAGE =
  "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé. Réessayez uniquement la lecture.";

export const describeWriteFailure = (
  outcome: Exclude<WriteOutcome, { status: "saved" }>,
) =>
  outcome.status === "uncertain"
    ? "Le résultat de l’enregistrement est incertain. Vérifiez les données avant de réessayer. Pour un virement, reprenez la même tentative afin d’éviter un doublon."
    : vaultErrorMessage(
        outcome.code,
        "L’enregistrement a échoué. Vérifiez les valeurs puis réessayez.",
      );

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Clé d'idempotence d'un virement manuel (8 à 100 caractères ASCII). Le
 * moteur natif n'expose pas `crypto.randomUUID` : l'instant et 20 caractères
 * aléatoires suffisent, car une collision serait refusée par le serveur
 * (`IDEMPOTENCY_CONFLICT`) au lieu de créer un doublon.
 */
export const createIdempotencyKey = () =>
  `manual:${Date.now().toString(36)}-${Array.from(
    { length: 20 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("")}`;

/**
 * Tentative à envoyer. Après une réponse incertaine, `pending` est renvoyée
 * telle quelle : même corps, même clé, donc aucun doublon possible.
 */
export const nextTransferAttempt = (
  pending: TransferAttempt | null,
  draft: TransferDraft,
  today: string,
  createKey: () => string = createIdempotencyKey,
): ReturnType<typeof validateTransferDraft> =>
  pending === null
    ? validateTransferDraft(draft, today, createKey)
    : { ok: true, value: pending };

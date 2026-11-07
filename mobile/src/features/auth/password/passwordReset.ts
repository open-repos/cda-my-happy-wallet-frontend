import {
  PublicAccountError,
  getPasswordValidationError,
  getPublicAccountErrorMessage,
} from "@/src/features/auth/account/PublicAccountGateway";

/** Format exact des jetons du backend (`parseResetToken`). */
const PASSWORD_RESET_TOKEN_PATTERN = /^[a-f0-9]{128}$/;

export const INVALID_RESET_LINK_MESSAGE =
  "Ce lien de réinitialisation est invalide, a expiré ou a déjà été utilisé. Demandez un nouveau lien pour choisir votre mot de passe.";

export const isPasswordResetToken = (value: unknown): value is string =>
  typeof value === "string" && PASSWORD_RESET_TOKEN_PATTERN.test(value);

export const getNewPasswordValidationError = (
  password: string,
  confirmPassword: string,
): string | null => getPasswordValidationError(password, confirmPassword);

export type PasswordResetFailure =
  | { kind: "invalid-link" }
  | { kind: "retryable"; message: string };

const INVALID_LINK_STATUSES = new Set([401, 403, 404]);

/** Lien à redemander (jeton refusé) ou erreur temporaire à réessayer. */
export const getPasswordResetFailure = (
  error: unknown,
): PasswordResetFailure =>
  error instanceof PublicAccountError &&
  error.kind === "http" &&
  error.status != null &&
  INVALID_LINK_STATUSES.has(error.status)
    ? { kind: "invalid-link" }
    : { kind: "retryable", message: getPublicAccountErrorMessage(error) };

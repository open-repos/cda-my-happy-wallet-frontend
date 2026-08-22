export interface RegistrationDraft {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmpassword: string;
}

export type PublicAccountErrorKind =
  | "validation"
  | "network"
  | "rate_limited"
  | "http";

export class PublicAccountError extends Error {
  public constructor(
    public readonly kind: PublicAccountErrorKind,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(`Public account request failed: ${kind}`);
    this.name = "PublicAccountError";
  }
}

export interface PublicAccountGateway {
  register(draft: RegistrationDraft): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()+=._-]).{8,}$/;

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const getEmailValidationError = (email: string): string | null => {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail.length === 0) {
    return "Renseignez votre email.";
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return "Utilisez une adresse email valide.";
  }
  return null;
};

export const getRegistrationValidationError = (
  draft: RegistrationDraft,
): string | null => {
  if (
    draft.firstname.trim().length === 0 ||
    draft.lastname.trim().length === 0
  ) {
    return "Renseignez votre prénom et votre nom.";
  }

  const emailError = getEmailValidationError(draft.email);
  if (emailError != null) {
    return emailError;
  }

  if (!STRONG_PASSWORD_PATTERN.test(draft.password)) {
    return "Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial.";
  }
  if (draft.password !== draft.confirmpassword) {
    return "Les mots de passe ne correspondent pas.";
  }
  return null;
};

export const getPublicAccountErrorMessage = (error: unknown): string => {
  if (!(error instanceof PublicAccountError)) {
    return "Une erreur inattendue est survenue. Réessayez.";
  }
  if (error.kind === "network") {
    return "Le service est momentanément inaccessible. Vérifiez votre connexion puis réessayez.";
  }
  if (error.kind === "rate_limited") {
    return error.retryAfterSeconds == null
      ? "Trop de tentatives. Réessayez dans quelques instants."
      : `Trop de tentatives. Réessayez dans ${error.retryAfterSeconds} secondes.`;
  }
  if (error.kind === "validation") {
    return "Certaines informations sont invalides. Vérifiez le formulaire.";
  }
  return "La demande n’a pas pu aboutir. Réessayez.";
};

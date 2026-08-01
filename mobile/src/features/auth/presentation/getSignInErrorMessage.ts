import { AuthGatewayError } from "@/src/features/auth/session/AuthGateway";

export const getSignInErrorMessage = (error: unknown): string => {
  if (!(error instanceof AuthGatewayError)) {
    return "Une erreur inattendue est survenue.";
  }

  switch (error.kind) {
    case "unauthorized":
      return "Email ou mot de passe incorrect.";
    case "rate_limited":
      return error.retryAfterSeconds == null
        ? "Trop de tentatives. Reessayez plus tard."
        : `Trop de tentatives. Reessayez dans ${error.retryAfterSeconds} secondes.`;
    case "network":
      return "Connexion au serveur impossible.";
    case "invalid_response":
      return "La reponse du serveur est invalide.";
    case "http":
      return "La connexion a echoue. Reessayez.";
  }
};

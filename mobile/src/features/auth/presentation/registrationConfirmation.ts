import {
  isRegistrationConfirmationOutcome,
  type RegistrationConfirmationOutcome,
} from "@/src/navigation/incomingLinks";

export interface RegistrationConfirmationFeedback {
  kind: "error" | "success";
  message: string;
}

/** Mêmes libellés que la page de connexion Web (`Login.jsx`). */
const FEEDBACK: Record<
  RegistrationConfirmationOutcome,
  RegistrationConfirmationFeedback
> = {
  confirmed: { kind: "success", message: "Votre compte a bien été créé !" },
  "already-used": {
    kind: "error",
    message:
      "Ce lien de confirmation a déjà été utilisé. Vous pouvez vous connecter.",
  },
  "invalid-or-expired": {
    kind: "error",
    message:
      "Ce lien de confirmation est invalide ou a expiré. Recommencez l’inscription pour recevoir un nouveau lien.",
  },
};

/** Message à afficher pour le paramètre `confirmation` de l'écran de connexion. */
export const getRegistrationConfirmationFeedback = (
  value: unknown,
): RegistrationConfirmationFeedback | null =>
  isRegistrationConfirmationOutcome(value) ? FEEDBACK[value] : null;

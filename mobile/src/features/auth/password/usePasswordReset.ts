import { useEffect, useRef, useState } from "react";

import type { PublicAccountGateway } from "@/src/features/auth/account/PublicAccountGateway";

import {
  getNewPasswordValidationError,
  getPasswordResetFailure,
  isPasswordResetToken,
} from "./passwordReset";

export type PasswordResetStep =
  | { kind: "verifying" }
  | { kind: "verify-failed"; message: string }
  | { kind: "invalid-link" }
  | { kind: "form" }
  | { kind: "done" };

const stepForToken = (token: string | null): PasswordResetStep =>
  token == null ? { kind: "invalid-link" } : { kind: "verifying" };

const readToken = (value: string | undefined): string | null =>
  isPasswordResetToken(value) ? value : null;

/**
 * Parcours « nouveau mot de passe » depuis le lien email (#219).
 *
 * Le jeton n'est gardé qu'en mémoire, le temps de la vérification puis de
 * l'envoi : jamais journalisé ni persisté, et oublié après succès. Le
 * paramètre de route qui l'apporte est retiré par l'écran dès sa lecture.
 */
export const usePasswordReset = (
  gateway: PublicAccountGateway,
  resetTokenParam: string | undefined,
) => {
  const [token, setToken] = useState(() => readToken(resetTokenParam));
  const [step, setStep] = useState(() => stepForToken(token));
  const [readParam, setReadParam] = useState(resetTokenParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentToken = useRef(token);

  useEffect(() => {
    currentToken.current = token;
  }, [token]);

  // Un nouveau lien reçu alors que l'écran est ouvert remplace le précédent.
  if (resetTokenParam !== readParam) {
    setReadParam(resetTokenParam);
    if (resetTokenParam !== undefined) {
      const nextToken = readToken(resetTokenParam);
      setToken(nextToken);
      setStep(stepForToken(nextToken));
      setErrorMessage(null);
    }
  }

  useEffect(() => {
    if (step.kind !== "verifying" || token == null) {
      return;
    }
    let isCurrent = true;
    gateway.verifyPasswordResetToken(token).then(
      () => {
        if (isCurrent) {
          setStep({ kind: "form" });
        }
      },
      (error: unknown) => {
        if (!isCurrent) {
          return;
        }
        const failure = getPasswordResetFailure(error);
        setStep(
          failure.kind === "invalid-link"
            ? failure
            : { kind: "verify-failed", message: failure.message },
        );
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [gateway, step.kind, token]);

  const retryVerification = () => setStep({ kind: "verifying" });

  const submit = async (password: string, confirmPassword: string) => {
    const validationError = getNewPasswordValidationError(
      password,
      confirmPassword,
    );
    if (validationError != null) {
      setErrorMessage(validationError);
      return;
    }

    const submittedToken = token;
    // Un nouveau lien reçu pendant l'envoi l'emporte sur sa réponse.
    const isStale = () => currentToken.current !== submittedToken;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await gateway.setNewPassword(password, confirmPassword);
      if (isStale()) {
        return;
      }
      setToken(null);
      setStep({ kind: "done" });
    } catch (error) {
      if (isStale()) {
        return;
      }
      const failure = getPasswordResetFailure(error);
      if (failure.kind === "invalid-link") {
        setToken(null);
        setStep(failure);
      } else {
        setErrorMessage(failure.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return { errorMessage, isSubmitting, retryVerification, step, submit };
};

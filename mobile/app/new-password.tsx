import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { createPublicAccountGateway } from "@/src/composition/createPublicAccountGateway";
import { FeedbackState } from "@/src/design/FeedbackState";
import { INVALID_RESET_LINK_MESSAGE } from "@/src/features/auth/password/passwordReset";
import { usePasswordReset } from "@/src/features/auth/password/usePasswordReset";
import { useClearedRouteParam } from "@/src/navigation/useClearedRouteParam";
import {
  AuthActionButton,
  AuthField,
  AuthLinkRow,
  AuthMessage,
  AuthScreen,
  AuthSuccess,
} from "@/src/features/auth/presentation/AuthScreen";

/**
 * Nouveau mot de passe depuis le lien email (#219). Hors des groupes protégés :
 * le lien s'ouvre que la session soit ouverte ou non.
 */
export default function NewPasswordScreen() {
  const router = useRouter();
  const { resetToken } = useLocalSearchParams<{ resetToken?: string }>();
  const gateway = useMemo(() => createPublicAccountGateway(), []);
  const { errorMessage, isSubmitting, retryVerification, step, submit } =
    usePasswordReset(gateway, resetToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Le jeton ne reste pas dans la route (historique, retour arrière).
  useClearedRouteParam("resetToken", resetToken);

  const backToSignIn = () => router.replace("/sign-in");
  const requestNewLink = () => router.replace("/forgot-password");

  if (step.kind === "done") {
    return (
      <AuthScreen
        subtitle="Vous pouvez maintenant vous connecter avec ce mot de passe."
        title="Votre demande a été prise en compte !"
      >
        <AuthSuccess
          message="Votre mot de passe a été modifié avec succès."
          title="Mot de passe modifié"
        />
        <AuthActionButton
          icon="log-in-outline"
          label="Revenir à la connexion"
          onPress={backToSignIn}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={backToSignIn}
      subtitle="Au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial."
      title="Choisissez votre nouveau mot de passe"
    >
      {step.kind === "verifying" ? (
        <FeedbackState
          description="Vérification du lien reçu par email."
          framed={false}
          kind="loading"
          title="Vérification du lien"
        />
      ) : null}

      {step.kind === "verify-failed" ? (
        <>
          <AuthMessage kind="error">{step.message}</AuthMessage>
          <AuthActionButton
            icon="refresh"
            label="Réessayer"
            onPress={retryVerification}
          />
        </>
      ) : null}

      {step.kind === "invalid-link" ? (
        <>
          <AuthMessage kind="error">{INVALID_RESET_LINK_MESSAGE}</AuthMessage>
          <AuthActionButton
            icon="mail-outline"
            label="Demander un nouveau lien"
            onPress={requestNewLink}
          />
        </>
      ) : null}

      {step.kind === "form" ? (
        <>
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isSubmitting}
            icon="lock-closed-outline"
            label="Nouveau mot de passe"
            onChangeText={setPassword}
            placeholder="Entrez votre mot de passe"
            returnKeyType="next"
            secureTextEntry
            textContentType="newPassword"
            value={password}
          />
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isSubmitting}
            icon="lock-closed-outline"
            label="Confirmer le nouveau mot de passe"
            onChangeText={setConfirmPassword}
            onSubmitEditing={() => void submit(password, confirmPassword)}
            placeholder="Confirmez votre mot de passe"
            returnKeyType="done"
            secureTextEntry
            textContentType="newPassword"
            value={confirmPassword}
          />

          {errorMessage != null ? (
            <AuthMessage kind="error">{errorMessage}</AuthMessage>
          ) : null}

          <AuthActionButton
            icon="checkmark-circle-outline"
            isLoading={isSubmitting}
            label="Enregistrer le mot de passe"
            onPress={() => void submit(password, confirmPassword)}
          />
        </>
      ) : null}

      <AuthLinkRow
        label="Vous connaissez votre mot de passe ?"
        linkLabel="Se connecter"
        onPress={backToSignIn}
      />
    </AuthScreen>
  );
}

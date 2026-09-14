import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { createPublicAccountGateway } from "@/src/composition/createPublicAccountGateway";
import {
  getEmailValidationError,
  getPublicAccountErrorMessage,
} from "@/src/features/auth/account/PublicAccountGateway";
import {
  AuthActionButton,
  AuthField,
  AuthLinkRow,
  AuthMessage,
  AuthScreen,
  AuthSuccess,
} from "@/src/features/auth/presentation/AuthScreen";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const gateway = useMemo(() => createPublicAccountGateway(), []);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    const validationError = getEmailValidationError(email);
    if (validationError != null) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await gateway.requestPasswordReset(email);
      setIsComplete(true);
    } catch (error) {
      setErrorMessage(getPublicAccountErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      onBack={() => router.replace("/sign-in")}
      subtitle="Renseignez votre email pour recevoir un lien sécurisé."
      title="Vous avez oublié votre mot de passe ?"
    >
      {isComplete ? (
        <>
          <AuthSuccess
            message="Si un compte correspond à cette adresse, un lien de changement de mot de passe vient d’être envoyé."
            title="Votre demande a été prise en compte"
          />
          <AuthActionButton
            icon="arrow-back"
            label="Revenir à la connexion"
            onPress={() => router.replace("/sign-in")}
          />
        </>
      ) : (
        <>
          <AuthField
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
            icon="mail-outline"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            onSubmitEditing={() => void submit()}
            placeholder="Entrez votre email"
            returnKeyType="send"
            textContentType="emailAddress"
            value={email}
          />

          {errorMessage != null ? (
            <AuthMessage kind="error">{errorMessage}</AuthMessage>
          ) : null}

          <AuthActionButton
            icon="send-outline"
            isLoading={isSubmitting}
            label="Envoyer le lien"
            onPress={() => void submit()}
          />
          <AuthLinkRow
            label="Vous connaissez votre mot de passe ?"
            linkLabel="Se connecter"
            onPress={() => router.replace("/sign-in")}
          />
        </>
      )}
    </AuthScreen>
  );
}

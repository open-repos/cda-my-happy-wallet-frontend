import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { createPublicAccountGateway } from "@/src/composition/createPublicAccountGateway";
import {
  RegistrationDraft,
  getPublicAccountErrorMessage,
  getRegistrationValidationError,
} from "@/src/features/auth/account/PublicAccountGateway";
import {
  AuthActionButton,
  AuthField,
  AuthLinkRow,
  AuthMessage,
  AuthScreen,
  AuthSuccess,
} from "@/src/features/auth/presentation/AuthScreen";

const EMPTY_DRAFT: RegistrationDraft = {
  firstname: "",
  lastname: "",
  email: "",
  password: "",
  confirmpassword: "",
};

export default function RegisterScreen() {
  const router = useRouter();
  const gateway = useMemo(() => createPublicAccountGateway(), []);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const update = (field: keyof RegistrationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    const validationError = getRegistrationValidationError(draft);
    if (validationError != null) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await gateway.register(draft);
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
      subtitle="Créez votre espace personnel en quelques instants."
      title="C’est par ici pour s’enregistrer !"
    >
      {isComplete ? (
        <>
          <AuthSuccess
            message="Consultez votre boîte email pour confirmer votre compte avant de vous connecter."
            title="Merci pour votre inscription !"
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
            autoCapitalize="words"
            autoComplete="given-name"
            editable={!isSubmitting}
            icon="person-outline"
            label="Prénom"
            onChangeText={(value) => update("firstname", value)}
            placeholder="Entrez votre prénom"
            textContentType="givenName"
            value={draft.firstname}
          />
          <AuthField
            autoCapitalize="words"
            autoComplete="family-name"
            editable={!isSubmitting}
            icon="person-outline"
            label="Nom"
            onChangeText={(value) => update("lastname", value)}
            placeholder="Entrez votre nom"
            textContentType="familyName"
            value={draft.lastname}
          />
          <AuthField
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
            icon="mail-outline"
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => update("email", value)}
            placeholder="Entrez votre email"
            textContentType="emailAddress"
            value={draft.email}
          />
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isSubmitting}
            icon="lock-closed-outline"
            label="Mot de passe"
            onChangeText={(value) => update("password", value)}
            placeholder="Entrez votre mot de passe"
            secureTextEntry
            textContentType="newPassword"
            value={draft.password}
          />
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!isSubmitting}
            icon="shield-checkmark-outline"
            label="Confirmer le mot de passe"
            onChangeText={(value) => update("confirmpassword", value)}
            onSubmitEditing={() => void submit()}
            placeholder="Retapez votre mot de passe"
            returnKeyType="done"
            secureTextEntry
            textContentType="newPassword"
            value={draft.confirmpassword}
          />

          {errorMessage != null ? (
            <AuthMessage kind="error">{errorMessage}</AuthMessage>
          ) : null}

          <AuthActionButton
            icon="person-add-outline"
            isLoading={isSubmitting}
            label="S’enregistrer"
            onPress={() => void submit()}
          />
          <AuthLinkRow
            label="Déjà inscrit ?"
            linkLabel="Se connecter"
            onPress={() => router.replace("/sign-in")}
          />
        </>
      )}
    </AuthScreen>
  );
}

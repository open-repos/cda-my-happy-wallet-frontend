import { useRouter } from "expo-router";
import { useState } from "react";

import {
  AuthActionButton,
  AuthField,
  AuthLinkRow,
  AuthMessage,
  AuthScreen,
} from "@/src/features/auth/presentation/AuthScreen";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { getSignInErrorMessage } from "@/src/features/auth/presentation/getSignInErrorMessage";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length === 0 || password.length === 0) {
      setErrorMessage("Renseignez votre email et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signIn({ email: normalizedEmail, password });
    } catch (error) {
      setErrorMessage(getSignInErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScreen
      subtitle="Retrouvez votre espace personnel et votre budget."
      title="Bienvenue sur My Happy Wallet"
    >
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        editable={!isSubmitting}
        icon="mail-outline"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="Entrez votre email"
        returnKeyType="next"
        textContentType="username"
        value={email}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="current-password"
        editable={!isSubmitting}
        icon="lock-closed-outline"
        label="Mot de passe"
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        placeholder="Entrez votre mot de passe"
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
      />

      <AuthLinkRow
        label="Mot de passe oublié ?"
        linkLabel="Réinitialiser"
        onPress={() => router.push("/forgot-password")}
      />

      {errorMessage != null ? (
        <AuthMessage kind="error">{errorMessage}</AuthMessage>
      ) : null}

      <AuthActionButton
        icon="log-in-outline"
        isLoading={isSubmitting}
        label="Se connecter"
        onPress={() => void submit()}
      />
      <AuthLinkRow
        label="Pas encore inscrit ?"
        linkLabel="Créer un compte"
        onPress={() => router.push("/register")}
      />
    </AuthScreen>
  );
}

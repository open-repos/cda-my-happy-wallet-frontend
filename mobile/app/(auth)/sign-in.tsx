import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { getSignInErrorMessage } from "@/src/features/auth/presentation/getSignInErrorMessage";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim();
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons color="#FFFFFF" name="wallet" size={28} />
            </View>
            <Text style={styles.brandName}>My Happy Wallet</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>
              Retrouvez votre espace personnel.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="vous@exemple.fr"
              returnKeyType="next"
              style={styles.input}
              textContentType="username"
              value={email}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordField}>
              <TextInput
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!isSubmitting}
                onChangeText={setPassword}
                onSubmitEditing={() => void submit()}
                placeholder="Votre mot de passe"
                returnKeyType="done"
                secureTextEntry={!isPasswordVisible}
                style={styles.passwordInput}
                textContentType="password"
                value={password}
              />
              <Pressable
                accessibilityLabel={
                  isPasswordVisible
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => setIsPasswordVisible((visible) => !visible)}
                style={styles.visibilityButton}
              >
                <Ionicons
                  color="#4D5866"
                  name={isPasswordVisible ? "eye-off" : "eye"}
                  size={22}
                />
              </Pressable>
            </View>

            {errorMessage != null ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons color="#FFFFFF" name="log-in-outline" size={20} />
                  <Text style={styles.submitButtonLabel}>Se connecter</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F5F7FA",
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brand: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: "#147D64",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  brandName: {
    color: "#17202A",
    fontSize: 22,
    fontWeight: "800",
  },
  formSection: {
    alignSelf: "center",
    marginTop: 48,
    maxWidth: 440,
    width: "100%",
  },
  title: {
    color: "#17202A",
    fontSize: 30,
    fontWeight: "800",
  },
  subtitle: {
    color: "#5E6875",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  label: {
    color: "#28333F",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 22,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#C8D0D9",
    borderRadius: 6,
    borderWidth: 1,
    color: "#17202A",
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  passwordField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#C8D0D9",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 50,
  },
  passwordInput: {
    color: "#17202A",
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 8,
  },
  visibilityButton: {
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  errorText: {
    color: "#B33A3A",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: "#275DAD",
    borderRadius: 6,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 50,
    paddingHorizontal: 18,
  },
  submitButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});

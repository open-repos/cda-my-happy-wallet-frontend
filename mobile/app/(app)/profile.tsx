import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { DestinationScreen } from "@/src/navigation/DestinationScreen";

const colors = themes.light.color;
const semiboldFontWeight = `${primitives.fontWeight.semibold}` as "600";

export default function ProfileScreen() {
  const { signOut, state } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const email =
    state.status === "authenticated" || state.status === "refreshing"
      ? state.user.email
      : "";

  const logout = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  return (
    <DestinationScreen
      description="Gérez votre identité et terminez votre session depuis cet espace protégé."
      icon="person-outline"
      title="Profil"
    >
      <View style={styles.accountCard}>
        <Text style={styles.accountLabel}>Compte connecté</Text>
        <Text selectable style={styles.email}>
          {email}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={() => void logout()}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && styles.pressed,
          isSigningOut && styles.disabled,
        ]}
      >
        {isSigningOut ? (
          <ActivityIndicator color={colors.actionDangerText} size="small" />
        ) : null}
        <Text style={styles.logoutLabel}>
          {isSigningOut ? "Déconnexion…" : "Se déconnecter"}
        </Text>
      </Pressable>
    </DestinationScreen>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    marginTop: primitives.space["8"],
    maxWidth: primitives.size.contentSm,
    padding: semantic.space.card,
  },
  accountLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semiboldFontWeight,
  },
  email: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    marginTop: primitives.space["2"],
  },
  logoutButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.actionDangerBackground,
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: primitives.space["2"],
    justifyContent: "center",
    marginTop: primitives.space["6"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  logoutLabel: {
    color: colors.actionDangerText,
    fontSize: primitives.fontSize.md,
    fontWeight: semiboldFontWeight,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.65,
  },
});

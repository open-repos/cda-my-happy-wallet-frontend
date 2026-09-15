import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { FeedbackState } from "@/src/design/FeedbackState";
import { primitives, themes } from "@/src/design/tokens";
import {
  AuthProvider,
  useAuth,
} from "@/src/features/auth/presentation/AuthProvider";

const SessionNavigator = () => {
  const { restore, state } = useAuth();

  if (state.status === "restoring") {
    return (
      <View style={styles.feedbackScreen}>
        <FeedbackState
          description="Votre session sécurisée est en cours de vérification."
          kind="loading"
          title="Restauration de la session"
        />
      </View>
    );
  }

  if (state.status === "unavailable") {
    return (
      <View style={styles.feedbackScreen}>
        <FeedbackState
          actions={[
            {
              label: "Réessayer",
              onPress: () => void restore().catch(() => undefined),
            },
          ]}
          description="La session n’a pas pu être restaurée. Vos données locales sont conservées."
          kind="error"
          title="Service indisponible"
        />
      </View>
    );
  }

  const isAuthenticated =
    state.status === "authenticated" || state.status === "refreshing";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <SessionNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  feedbackScreen: {
    backgroundColor: themes.light.color.backgroundCanvas,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: primitives.space["6"],
  },
});

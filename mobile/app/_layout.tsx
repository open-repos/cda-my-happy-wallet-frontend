import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import "react-native-reanimated";

import {
  AuthProvider,
  useAuth,
} from "@/src/features/auth/presentation/AuthProvider";

const SessionNavigator = () => {
  const { restore, state } = useAuth();

  if (state.status === "restoring") {
    return (
      <View style={styles.feedbackScreen}>
        <ActivityIndicator color="#275DAD" size="large" />
        <Text style={styles.feedbackTitle}>Restauration de la session</Text>
      </View>
    );
  }

  if (state.status === "unavailable") {
    return (
      <View style={styles.feedbackScreen}>
        <Text style={styles.feedbackTitle}>Service indisponible</Text>
        <Text style={styles.feedbackMessage}>
          La session n&apos;a pas pu etre restauree. Vos donnees locales sont
          conservees.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void restore().catch(() => undefined)}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.retryButtonLabel}>Reessayer</Text>
        </Pressable>
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
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  feedbackTitle: {
    color: "#17202A",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 18,
    textAlign: "center",
  },
  feedbackMessage: {
    color: "#4D5866",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 420,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#275DAD",
    borderRadius: 6,
    justifyContent: "center",
    marginTop: 24,
    minHeight: 46,
    paddingHorizontal: 22,
  },
  retryButtonLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});

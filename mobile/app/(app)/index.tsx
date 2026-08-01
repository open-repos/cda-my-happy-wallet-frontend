import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { getApiReadiness } from "@/src/features/health/getApiReadiness";

type ConnectionStatus = "checking" | "online" | "offline";

const readConnectionStatus = async (): Promise<ConnectionStatus> => {
  try {
    await getApiReadiness();
    return "online";
  } catch {
    return "offline";
  }
};

export default function HomeScreen() {
  const { signOut, state } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const checkConnection = useCallback(async () => {
    setStatus("checking");
    setStatus(await readConnectionStatus());
  }, []);

  useEffect(() => {
    let isMounted = true;
    void readConnectionStatus().then((nextStatus) => {
      if (isMounted) {
        setStatus(nextStatus);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const email =
    state.status === "authenticated" || state.status === "refreshing"
      ? state.user.email
      : "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons color="#FFFFFF" name="wallet" size={25} />
            </View>
            <View style={styles.identity}>
              <Text style={styles.brandName}>My Happy Wallet</Text>
              <Text numberOfLines={1} style={styles.email}>
                {email}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Se deconnecter"
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => void logout()}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator color="#B33A3A" size="small" />
            ) : (
              <Ionicons color="#B33A3A" name="log-out-outline" size={23} />
            )}
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>TABLEAU DE BORD</Text>
          <Text style={styles.title}>Votre budget en un coup d&apos;oeil</Text>
        </View>

        <View style={styles.statusPanel}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelTitle}>Etat du service</Text>
            {status === "checking" ? (
              <ActivityIndicator color="#275DAD" size="small" />
            ) : (
              <Ionicons
                color={status === "online" ? "#147D64" : "#B33A3A"}
                name={status === "online" ? "checkmark-circle" : "alert-circle"}
                size={22}
              />
            )}
          </View>
          <Text style={styles.statusLabel}>
            {status === "checking"
              ? "Verification en cours"
              : status === "online"
                ? "Services disponibles"
                : "Connexion indisponible"}
          </Text>
          {status === "offline" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void checkConnection()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons color="#FFFFFF" name="refresh" size={18} />
              <Text style={styles.retryButtonLabel}>Reessayer</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F5F7FA",
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 11,
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: "#147D64",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  identity: {
    flexShrink: 1,
  },
  brandName: {
    color: "#17202A",
    fontSize: 18,
    fontWeight: "800",
  },
  email: {
    color: "#5E6875",
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    marginLeft: 12,
    width: 44,
  },
  welcome: {
    marginTop: 60,
    maxWidth: 520,
  },
  eyebrow: {
    color: "#B4512E",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#17202A",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 10,
  },
  statusPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE2E8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 38,
    padding: 20,
  },
  panelHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  panelTitle: {
    color: "#17202A",
    fontSize: 16,
    fontWeight: "700",
  },
  statusLabel: {
    color: "#4D5866",
    fontSize: 15,
    marginTop: 12,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#275DAD",
    borderRadius: 6,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 16,
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

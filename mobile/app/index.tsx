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

import { getApiReadiness } from "@/src/features/health/getApiReadiness";

type ConnectionStatus = "checking" | "online" | "offline";

const statusContent: Record<
  Exclude<ConnectionStatus, "checking">,
  { color: string; icon: "checkmark-circle" | "alert-circle"; label: string }
> = {
  online: {
    color: "#147D64",
    icon: "checkmark-circle",
    label: "Services disponibles",
  },
  offline: {
    color: "#B33A3A",
    icon: "alert-circle",
    label: "Connexion indisponible",
  },
};

const readConnectionStatus = async (): Promise<ConnectionStatus> => {
  try {
    await getApiReadiness();
    return "online";
  } catch {
    return "offline";
  }
};

export default function HomeScreen() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons color="#FFFFFF" name="wallet" size={28} />
          </View>
          <View>
            <Text style={styles.brandName}>My Happy Wallet</Text>
            <Text style={styles.brandCaption}>
              Votre budget, partout avec vous
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>APPLICATION MOBILE</Text>
          <Text style={styles.title}>Gardez un oeil sur votre quotidien.</Text>
          <Text style={styles.summary}>
            Revenus, charges et reste a vivre dans une experience pensee pour le
            mobile.
          </Text>
        </View>

        <View style={styles.statusPanel}>
          <Text style={styles.panelTitle}>Etat du service</Text>
          {status === "checking" ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color="#275DAD" size="small" />
              <Text style={styles.statusLabel}>Verification en cours</Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons
                color={statusContent[status].color}
                name={statusContent[status].icon}
                size={22}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { color: statusContent[status].color },
                ]}
              >
                {statusContent[status].label}
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={checkConnection}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Ionicons color="#FFFFFF" name="refresh" size={18} />
            <Text style={styles.retryButtonLabel}>Verifier a nouveau</Text>
          </Pressable>
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
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brand: {
    alignItems: "center",
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
    fontSize: 20,
    fontWeight: "700",
  },
  brandCaption: {
    color: "#5E6875",
    fontSize: 13,
    marginTop: 2,
  },
  hero: {
    marginTop: 72,
    maxWidth: 520,
  },
  eyebrow: {
    color: "#B4512E",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#17202A",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 41,
    marginTop: 12,
  },
  summary: {
    color: "#4D5866",
    fontSize: 17,
    lineHeight: 25,
    marginTop: 16,
  },
  statusPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCE2E8",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 48,
    padding: 20,
  },
  panelTitle: {
    color: "#17202A",
    fontSize: 16,
    fontWeight: "700",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 28,
    marginTop: 16,
  },
  statusLabel: {
    color: "#4D5866",
    fontSize: 15,
    fontWeight: "600",
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#275DAD",
    borderRadius: 6,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

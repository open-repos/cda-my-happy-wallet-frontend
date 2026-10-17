import { ChartGateway } from "@/src/features/charts/ChartGateway";
import { DashboardCharts } from "@/src/features/charts/DashboardCharts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { semantic, themes } from "@/src/design/tokens";
import { FeedbackState } from "@/src/design/FeedbackState";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { HttpFixedBudgetGateway } from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";
import { useFixedBudget } from "@/src/features/dashboard/presentation/useFixedBudget";
import { HttpBudgetSummaryGateway } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
import { BudgetSummaryCards } from "@/src/features/budget/presentation/BudgetSummaryCards";

const colors = themes.light.color;

interface ActionCardProps {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
}

const ActionCard = ({ description, icon, label, onPress }: ActionCardProps) => (
  <Pressable
    accessibilityHint={description}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
  >
    <View style={styles.actionIcon}>
      <Ionicons color={colors.actionPrimaryBackground} name={icon} size={24} />
    </View>
    <View style={styles.actionCopy}>
      <Text style={styles.actionTitle}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </View>
    <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
  </Pressable>
);

export const DashboardScreen = () => {
  const router = useRouter();
  const { httpClient, signOut, state } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const gateway = useMemo(
    () => new HttpFixedBudgetGateway(httpClient),
    [httpClient],
  );
  const chartGateway = useMemo(
    () => new ChartGateway(httpClient),
    [httpClient],
  );
  const summaryGateway = useMemo(
    () => new HttpBudgetSummaryGateway(httpClient),
    [httpClient],
  );
  const { operationCount, retry, status } = useFixedBudget(gateway);
  const email =
    state.status === "authenticated" || state.status === "refreshing"
      ? state.user.email
      : "";

  const logout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Ionicons color={colors.textInverse} name="wallet" size={24} />
            </View>
            <View style={styles.identity}>
              <Text style={styles.brandName}>My Happy Wallet</Text>
              <Text numberOfLines={1} style={styles.email}>
                {email}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Se déconnecter"
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => void logout()}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.actionDangerBackground} />
            ) : (
              <Ionicons
                color={colors.actionDangerBackground}
                name="log-out-outline"
                size={24}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>TABLEAU DE BORD</Text>
          <Text style={styles.title}>Votre budget en un coup d’œil</Text>
          <Text style={styles.subtitle}>
            Retrouvez l’essentiel de votre budget mensuel.
          </Text>
        </View>

        {status === "loading" ? (
          <FeedbackState
            description="Vos charges et revenus sont en cours de chargement."
            kind="loading"
            title="Calcul de votre budget"
          />
        ) : null}

        {status === "error" ? (
          <FeedbackState
            actions={[{ label: "Réessayer", onPress: () => void retry() }]}
            description="Vérifiez votre connexion puis relancez le chargement."
            kind="error"
            title="Budget indisponible"
          />
        ) : null}

        {status === "success" && operationCount === 0 ? (
          <FeedbackState
            actions={[
              {
                label: "Configurer mon budget",
                onPress: () => router.push("/(app)/fixed-budget"),
              },
            ]}
            description="Ajoutez vos revenus et charges fixes pour calculer votre reste à vivre mensuel."
            icon="calculator-outline"
            kind="empty"
            title="Commencez votre budget"
          />
        ) : null}

        {status === "success" && operationCount > 0 ? (
          <BudgetSummaryCards gateway={summaryGateway} />
        ) : null}

        <DashboardCharts gateway={chartGateway} />

        <View style={styles.actions}>
          <Text style={styles.sectionTitle}>Continuez votre suivi</Text>
          <ActionCard
            description="Ajoutez ou corrigez vos revenus et charges mensuels."
            icon="calculator-outline"
            label="Budget fixe"
            onPress={() => router.push("/(app)/fixed-budget")}
          />
          <ActionCard
            description="Consultez, ajoutez ou modifiez vos mouvements."
            icon="list-outline"
            label="Opérations"
            onPress={() => router.push("/(app)/operations")}
          />
          <ActionCard
            description="Préparez vos projets et suivez leur avancement."
            icon="radio-button-on-outline"
            label="Objectifs"
            onPress={() => router.push("/(app)/goals")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    flexGrow: 1,
    gap: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12 },
  brandIcon: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.card,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  identity: { flex: 1 },
  brandName: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  logout: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  heading: { gap: 8, marginTop: 16 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 37,
  },
  subtitle: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  actions: { gap: 12 },
  sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  actionCard: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 76,
    padding: 16,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  actionCopy: { flex: 1, gap: 4 },
  actionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  actionDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.7 },
});

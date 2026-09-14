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
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { HttpFixedBudgetGateway } from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";
import { useFixedBudget } from "@/src/features/dashboard/presentation/useFixedBudget";

const colors = themes.light.color;
const money = (amount: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);

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
  const { operationCount, retry, status, summary } = useFixedBudget(gateway);
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
          <View accessibilityLiveRegion="polite" style={styles.stateCard}>
            <ActivityIndicator color={colors.focusRing} size="large" />
            <Text style={styles.stateTitle}>Calcul de votre budget</Text>
            <Text style={styles.centered}>
              Vos charges et revenus sont en cours de chargement.
            </Text>
          </View>
        ) : null}

        {status === "error" ? (
          <View accessibilityLiveRegion="assertive" style={styles.stateCard}>
            <View style={[styles.stateIcon, styles.errorIcon]}>
              <Ionicons
                color={colors.statusErrorText}
                name="cloud-offline-outline"
                size={28}
              />
            </View>
            <Text style={styles.stateTitle}>Budget indisponible</Text>
            <Text style={styles.centered}>
              Vérifiez votre connexion puis relancez le chargement.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void retry()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.actionPrimaryText}
                name="refresh"
                size={18}
              />
              <Text style={styles.primaryButtonText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        {status === "success" && operationCount === 0 ? (
          <View accessibilityLiveRegion="polite" style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons
                color={colors.actionPrimaryBackground}
                name="calculator-outline"
                size={28}
              />
            </View>
            <Text style={styles.stateTitle}>Commencez votre budget</Text>
            <Text style={styles.centered}>
              Ajoutez vos revenus et charges fixes pour calculer votre reste à
              vivre mensuel.
            </Text>
          </View>
        ) : null}

        {status === "success" && operationCount > 0 ? (
          <View
            accessibilityLabel={`Reste à vivre mensuel ${money(summary.remaining)}`}
            style={styles.budgetCard}
          >
            <View style={styles.budgetIcon}>
              <Ionicons
                color={colors.textInverse}
                name="wallet-outline"
                size={28}
              />
            </View>
            <Text style={styles.budgetLabel}>Reste à vivre mensuel</Text>
            <Text
              style={[
                styles.budgetAmount,
                summary.remaining < 0 && styles.negative,
              ]}
            >
              {money(summary.remaining)}
            </Text>
            <View style={styles.divider} />
            <View style={styles.totals}>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Revenus fixes</Text>
                <Text style={[styles.totalValue, styles.income]}>
                  {money(summary.income)}
                </Text>
              </View>
              <View style={styles.totalSeparator} />
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Charges fixes</Text>
                <Text style={[styles.totalValue, styles.expense]}>
                  {money(summary.expenses)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

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
  stateCard: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  errorIcon: { backgroundColor: colors.statusErrorSurface },
  stateTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  centered: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.actionPrimaryText,
    fontSize: 16,
    fontWeight: "600",
  },
  budgetCard: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: 1,
    padding: 24,
    shadowColor: semantic.shadow.card.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  budgetIcon: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  budgetLabel: { color: colors.textSecondary, fontSize: 16, marginTop: 16 },
  budgetAmount: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
    marginTop: 4,
  },
  negative: { color: colors.statusErrorText },
  divider: {
    backgroundColor: colors.borderSubtle,
    height: 1,
    marginVertical: 20,
    width: "100%",
  },
  totals: { flexDirection: "row", width: "100%" },
  totalItem: { alignItems: "center", flex: 1, gap: 4 },
  totalSeparator: { backgroundColor: colors.borderSubtle, width: 1 },
  totalLabel: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  totalValue: { fontSize: 16, fontWeight: "700" },
  income: { color: colors.dataIncome },
  expense: { color: colors.dataExpense },
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

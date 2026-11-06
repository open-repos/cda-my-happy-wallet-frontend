import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
// Barre d'état Android comme encoche iOS (#147).
import { SafeAreaView } from "react-native-safe-area-context";

import { FeedbackState } from "@/src/design/FeedbackState";
import { RadioChoice, RadioGroup } from "@/src/design/RadioGroup";
import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import {
  ForecastMonth,
  isNegativeAmount,
} from "@/src/features/forecast/domain/budgetForecast";
import { HttpBudgetForecastGateway } from "@/src/features/forecast/infrastructure/HttpBudgetForecastGateway";
import { useBudgetForecast } from "@/src/features/forecast/presentation/useBudgetForecast";
import { SimulationPanel } from "@/src/features/simulation/presentation/SimulationPanel";
import { SimulationReadout } from "@/src/features/simulation/presentation/SimulationReadout";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";
const HORIZONS = ["3", "6", "12"] as const;
type Horizon = (typeof HORIZONS)[number];
const HORIZON_CHOICES: RadioChoice<Horizon>[] = HORIZONS.map((value) => ({
  value,
  label: `${value} mois`,
}));

/** Lignes du détail mensuel, mêmes libellés et même ordre que le Web. */
const ROWS: [keyof ForecastMonth, string][] = [
  ["carryIn", "Report prévisionnel"],
  ["plannedIncome", "Entrées prévues"],
  ["plannedExpense", "Dépenses prévues"],
  ["goalSavings", "Épargne des objectifs"],
  ["forecastRemaining", "Reste de fin de mois"],
  ["prudentMonthlyAllowance", "Disponible par mois"],
  ["prudentWeeklyAllowance", "Disponible par semaine"],
  ["prudentDailyAllowance", "Disponible par jour"],
];

const formatMoney = (amount: string, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
    Number(amount),
  );
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
const longDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

const MonthCard = ({
  currency,
  month,
}: {
  currency: string;
  month: ForecastMonth;
}) => {
  const negative = isNegativeAmount(month.forecastRemaining);
  return (
    <View style={[styles.card, negative && styles.negativeCard]}>
      <View style={styles.cardHeading}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {monthLabel(month.month)}
        </Text>
        {/* Signalé par un texte et une icône, pas seulement par la couleur. */}
        {negative ? (
          <View style={styles.badge}>
            <Ionicons
              accessibilityElementsHidden
              color={colors.statusErrorText}
              importantForAccessibility="no"
              name="alert-circle-outline"
              size={16}
            />
            <Text style={styles.badgeLabel}>Solde négatif</Text>
          </View>
        ) : null}
      </View>
      {ROWS.map(([field, label]) => {
        const value = month[field] as string;
        return (
          // Un seul arrêt du lecteur d'écran par ligne : libellé et montant.
          <View
            key={field}
            accessible
            accessibilityLabel={`${label} : ${formatMoney(value, currency)}`}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>{label}</Text>
            <Text
              style={[
                styles.rowValue,
                isNegativeAmount(value) && styles.negativeValue,
              ]}
            >
              {formatMoney(value, currency)}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/** Écran « Prochains mois » (#214), ouvert depuis l'accueil et le calendrier. */
export const UpcomingMonthsScreen = () => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpBudgetForecastGateway(httpClient),
    [httpClient],
  );
  const [horizon, setHorizon] = useState<Horizon>("6");
  const from = currentParisMonth();
  const forecast = useBudgetForecast(gateway, from, Number(horizon));
  const data = forecast.data;
  const hasNegative =
    data?.months.some((month) => isNegativeAmount(month.forecastRemaining)) ??
    false;

  return (
    <SafeAreaView edges={TAB_SCREEN_EDGES} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.navigate("/(app)/calendar")
          }
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <Ionicons
            color={colors.actionSecondaryText}
            name="chevron-back"
            size={20}
          />
          <Text style={styles.backLabel}>Retour</Text>
        </Pressable>
        <Text style={styles.eyebrow}>PLANIFICATION</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Prochains mois
        </Text>
        <Text style={styles.subtitle}>
          Anticipez vos dépenses et votre épargne, mois après mois.
        </Text>

        <SimulationReadout month={from} />

        <Text style={styles.label}>Horizon de prévision</Text>
        <RadioGroup<Horizon>
          choices={HORIZON_CHOICES}
          disabled={false}
          label="Horizon de prévision"
          value={horizon}
          onChange={setHorizon}
        />
        <Text style={styles.help}>
          La prévision part du solde réel courant et tient compte des événements
          prévus, des charges et revenus fixes et des versements mensuels
          actuels de vos objectifs. Le disponible par jour et par semaine
          répartit le reste de fin de mois sur les jours restants.
        </Text>

        {forecast.status === "loading" ? (
          <FeedbackState
            description="Vos prochains mois sont en cours de calcul."
            kind="loading"
            title="Chargement des prévisions"
          />
        ) : null}
        {forecast.status === "error" ? (
          <FeedbackState
            actions={[{ label: "Réessayer", onPress: forecast.retry }]}
            description="Les prévisions n’ont pas pu être chargées. Vérifiez votre connexion puis réessayez."
            kind="error"
            title="Prévisions indisponibles"
          />
        ) : null}
        {forecast.status === "empty" ? (
          <FeedbackState
            description="Aucune prévision pour cette période."
            icon="calendar-outline"
            kind="empty"
            title="Pas encore de prévision"
          />
        ) : null}
        {forecast.status === "success" && data ? (
          <View style={styles.months}>
            <Text style={styles.help}>
              Prévision du {longDate(data.referenceDate)}. Solde réel de départ
              : {formatMoney(data.currentRealRemaining, data.currency)}.
            </Text>
            {hasNegative ? (
              <Text style={styles.negativeNote}>
                Les mois signalés « Solde négatif » présentent des dépenses et
                réservations supérieures au solde prévisionnel disponible.
              </Text>
            ) : null}
            {data.months.map((month) => (
              <MonthCard
                key={month.month}
                currency={data.currency}
                month={month}
              />
            ))}
          </View>
        ) : null}
        <SimulationPanel />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    gap: primitives.space["3"],
    padding: primitives.space["5"],
    paddingBottom: primitives.space["16"],
  },
  backLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: primitives.space["1"],
    minHeight: semantic.size.controlMinHeight,
  },
  backLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.8 },
  eyebrow: {
    color: colors.accent,
    fontSize: primitives.fontSize.xs,
    fontWeight: semibold,
  },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: semibold,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: 24,
  },
  label: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
    marginTop: primitives.space["3"],
  },
  help: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
  months: { gap: primitives.space["3"], marginTop: primitives.space["2"] },
  negativeNote: {
    color: colors.statusErrorText,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["2"],
    padding: primitives.space["4"],
  },
  negativeCard: { borderColor: colors.statusErrorText },
  cardHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "space-between",
    marginBottom: primitives.space["1"],
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.statusErrorSurface,
    borderRadius: primitives.radius.pill,
    flexDirection: "row",
    gap: primitives.space["1"],
    paddingHorizontal: primitives.space["3"],
    paddingVertical: primitives.space["1"],
  },
  badgeLabel: {
    color: colors.statusErrorText,
    fontSize: primitives.fontSize.xs,
    fontWeight: semibold,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "space-between",
  },
  rowLabel: { color: colors.textSecondary, fontSize: primitives.fontSize.sm },
  rowValue: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  negativeValue: { color: colors.statusErrorText },
});

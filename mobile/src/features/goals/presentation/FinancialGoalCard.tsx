import { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import type { ThemeTokens } from "@/src/design/tokens";
import { NativeChart } from "@/src/features/charts/NativeChart";
import { estimatedReachLabel, goalGaugeOption } from "./goalGaugeOption";
import {
  FinancialGoal,
  GOAL_STATUS_LABELS,
  forecastMessage,
  formatGoalMoney,
  goalPercent,
} from "@/src/features/goals/domain/financialGoal";

interface FinancialGoalCardProps {
  goal: FinancialGoal;
  onEdit(goal: FinancialGoal): void;
}

const semibold = `${primitives.fontWeight.semibold}` as "600";

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));

/** Carte d'un objectif : progression lisible, montants et prévision. */
export const FinancialGoalCard = ({ goal, onEdit }: FinancialGoalCardProps) => {
  const scheme = useColorScheme();
  const { fontScale } = useWindowDimensions();
  const colors = themes[scheme === "dark" ? "dark" : "light"].color;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const percent = goalPercent(goal);
  const option = useMemo(
    () => goalGaugeOption(percent, colors),
    [percent, colors],
  );
  const money = (amount: string) => formatGoalMoney(amount, goal.currency);
  const facts: [string, string][] = [
    ["Montant visé", money(goal.targetAmount)],
    ["Déjà épargné", money(goal.savedAmount)],
    ["Reste à épargner", money(goal.forecast.remainingAmount)],
    ["Versement mensuel", money(goal.monthlyContribution)],
    [
      "Requis pour tenir la date",
      goal.forecast.requiredMonthlyContribution === null
        ? "Non calculable"
        : money(goal.forecast.requiredMonthlyContribution),
    ],
    [
      "Date souhaitée",
      goal.targetDate == null ? "Aucune" : formatDate(goal.targetDate),
    ],
  ];
  return (
    <View style={styles.card} testID={`goal-card-${goal.id}`}>
      <View style={styles.heading}>
        <Text style={styles.title}>{goal.title}</Text>
        <Text style={styles.status}>
          {GOAL_STATUS_LABELS[goal.forecast.status]}
        </Text>
      </View>
      {/* Progression exposée en valeur et maximum, pas seulement en barre. */}
      {/* `accessible` : sans lui, VoiceOver ignore l'élément (iOS). */}
      <View
        accessible
        accessibilityLabel={`${percent} % de l’objectif ${goal.title} atteint : ${money(
          goal.savedAmount,
        )} sur ${money(goal.targetAmount)}`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        style={[styles.gauge, fontScale > 1.3 && styles.gaugeLarge]}
      >
        <NativeChart height={160} option={option} />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[styles.gaugeLabel, fontScale > 1.3 && styles.gaugeLabelLarge]}
        >
          <Text style={styles.percent}>{percent} %</Text>
          <Text style={styles.help}>déjà constitués</Text>
        </View>
      </View>
      <Text style={styles.help}>
        Montant déclaré ; les versements prévus n’augmentent pas cette jauge.
      </Text>
      <View
        accessible
        accessibilityLabel={`Atteinte estimée au rythme prévu : ${estimatedReachLabel(goal)}`}
        style={styles.arrival}
      >
        <Text style={styles.factLabel}>Atteinte estimée au rythme prévu</Text>
        <Text style={styles.arrivalDate}>{estimatedReachLabel(goal)}</Text>
      </View>
      <View style={styles.facts}>
        {facts.map(([label, value]) => (
          <View key={label} style={styles.fact}>
            <Text style={styles.factLabel}>{label}</Text>
            <Text style={styles.factValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.forecast}>{forecastMessage(goal)}</Text>
      <Pressable
        accessibilityLabel={`Modifier l’objectif ${goal.title}`}
        accessibilityRole="button"
        onPress={() => onEdit(goal)}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
      >
        <Text style={styles.editLabel}>Modifier</Text>
      </Pressable>
    </View>
  );
};

const makeStyles = (colors: ThemeTokens["color"]) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderSubtle,
      borderRadius: primitives.radius.lg,
      borderWidth: semantic.borderWidth.default,
      gap: primitives.space["3"],
      padding: primitives.space["4"],
    },
    heading: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      justifyContent: "space-between",
    },
    title: {
      color: colors.textPrimary,
      flexShrink: 1,
      fontSize: primitives.fontSize.lg,
      fontWeight: semibold,
    },
    status: {
      maxWidth: "100%",
      backgroundColor: colors.actionSecondaryBackground,
      borderRadius: primitives.radius.pill,
      color: colors.actionSecondaryText,
      fontSize: primitives.fontSize.xs,
      fontWeight: semibold,
      overflow: "hidden",
      paddingHorizontal: primitives.space["3"],
      paddingVertical: primitives.space["1"],
    },
    gauge: { width: "100%", maxWidth: 260, alignSelf: "center", height: 160 },
    gaugeLarge: { height: "auto" },
    gaugeLabelLarge: {
      position: "relative",
      bottom: undefined,
      left: undefined,
      right: undefined,
    },
    gaugeLabel: {
      position: "absolute",
      bottom: 28,
      left: 0,
      right: 0,
      alignItems: "center",
    },
    percent: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize["2xl"],
      fontWeight: semibold,
    },
    help: { color: colors.textSecondary, fontSize: primitives.fontSize.sm },
    arrival: { gap: primitives.space["2"] },
    arrivalDate: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.xl,
      fontWeight: semibold,
    },
    facts: { gap: primitives.space["2"] },
    fact: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      justifyContent: "space-between",
    },
    factLabel: {
      flexShrink: 1,
      maxWidth: "100%",
      color: colors.textSecondary,
      fontSize: primitives.fontSize.sm,
    },
    factValue: {
      flexShrink: 1,
      maxWidth: "100%",
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
    },
    forecast: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      lineHeight: 22,
    },
    editButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: colors.actionSecondaryBackground,
      borderRadius: semantic.radius.control,
      justifyContent: "center",
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    editLabel: {
      color: colors.actionSecondaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    pressed: { opacity: 0.8 },
  });

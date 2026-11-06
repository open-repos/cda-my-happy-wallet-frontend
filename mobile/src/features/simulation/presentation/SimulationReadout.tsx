import { useMemo } from "react";
import { StyleSheet, Switch, Text, View, useColorScheme } from "react-native";

import { FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import { HttpBudgetForecastGateway } from "@/src/features/forecast/infrastructure/HttpBudgetForecastGateway";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import { useSimulationComparison } from "@/src/features/simulation/presentation/useSimulationComparison";

const useStyles = () => {
  const theme: keyof typeof themes =
    useColorScheme() === "dark" ? "dark" : "light";
  const colors = themes[theme].color;
  return { theme, colors, styles: useMemo(() => makeStyles(colors), [colors]) };
};
const semibold = `${primitives.fontWeight.semibold}` as "600";

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

/** Mêmes phrases que le Web (`SimulationControls`). */
const EXPLANATION = {
  on: "Simulation affichée : les éléments potentiels sont inclus dans les prévisions et la capacité d’épargne. Les opérations réelles restent inchangées.",
  off: "Les chiffres habituels excluent les éléments potentiels. Activez la Simulation pour voir leur effet.",
};

const Comparison = ({ month }: { month: string }) => {
  const { styles, theme } = useStyles();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpBudgetForecastGateway(httpClient),
    [httpClient],
  );
  const state = useSimulationComparison(gateway, month);
  if (state.status === "idle") return null;
  return (
    <View style={styles.comparison}>
      <Text accessibilityRole="header" style={styles.comparisonTitle}>
        Reste prévu de {monthLabel(month)}
      </Text>
      {state.status === "loading" ? (
        <FeedbackState
          theme={theme}
          description="Calcul de l’écart de simulation…"
          framed={false}
          kind="loading"
          title="Comparaison"
        />
      ) : null}
      {state.status === "error" ? (
        <FeedbackState
          theme={theme}
          actions={[
            {
              accessibilityLabel: "Réessayer la comparaison",
              label: "Réessayer",
              onPress: state.retry,
            },
          ]}
          description="L’écart de simulation n’a pas pu être chargé."
          framed={false}
          kind="error"
          title="Comparaison indisponible"
        />
      ) : null}
      {state.status === "success" && state.data ? (
        <Text
          accessibilityLabel={`Prévision habituelle : ${formatMoney(
            state.data.standardRemaining,
            state.data.currency,
          )}, avec la Simulation : ${formatMoney(
            state.data.simulationRemaining,
            state.data.currency,
          )}`}
          style={styles.help}
        >
          Prévision habituelle :{" "}
          <Text style={styles.amount}>
            {formatMoney(state.data.standardRemaining, state.data.currency)}
          </Text>{" "}
          → Avec la Simulation :{" "}
          <Text style={styles.amount}>
            {formatMoney(state.data.simulationRemaining, state.data.currency)}
          </Text>
        </Text>
      ) : null}
    </View>
  );
};

/**
 * Interrupteur Simulation, explication et comparaison du mois affiché
 * (#240). Un mois passé n'a pas de prévision : son bilan reste inchangé.
 */
export const SimulationReadout = ({
  month = currentParisMonth(),
}: {
  month?: string;
}) => {
  const { colors, styles } = useStyles();
  const state = useSimulation();
  if (!state.available) return null;
  return (
    <View style={styles.card}>
      <View style={styles.toggle}>
        <Text style={styles.toggleLabel}>Simulation</Text>
        <Switch
          accessibilityLabel="Simulation"
          accessibilityRole="switch"
          onValueChange={state.setEnabled}
          thumbColor={colors.backgroundSurface}
          trackColor={{
            false: colors.borderStrong,
            true: colors.actionPrimaryBackground,
          }}
          value={state.enabled}
        />
      </View>
      <Text style={styles.help}>
        {state.enabled ? EXPLANATION.on : EXPLANATION.off}
      </Text>
      {month >= currentParisMonth() ? (
        <Comparison month={month} />
      ) : state.enabled ? (
        <Text style={styles.help}>
          Les bilans des mois passés restent inchangés.
        </Text>
      ) : null}
    </View>
  );
};

const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderSubtle,
      borderRadius: semantic.radius.card,
      borderWidth: semantic.borderWidth.default,
      gap: primitives.space["2"],
      padding: primitives.space["4"],
    },
    toggle: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: semantic.size.controlMinHeight,
    },
    toggleLabel: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    help: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    comparison: { gap: primitives.space["2"] },
    comparisonTitle: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    amount: { color: colors.textPrimary, fontWeight: semibold },
  });

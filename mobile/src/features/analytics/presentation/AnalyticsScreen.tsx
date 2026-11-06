import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
// Barre d'état Android comme encoche iOS (#147).
import { SafeAreaView } from "react-native-safe-area-context";

import { FeedbackState } from "@/src/design/FeedbackState";
import { RadioGroup } from "@/src/design/RadioGroup";
import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";
import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  GROUPINGS,
  Grouping,
  METRICS,
  Metric,
  PERIODS,
  Period,
  parisToday,
  rangeProblem,
  resolvePeriod,
  toApiQuery,
} from "@/src/features/analytics/domain/analytics";
import { HttpAnalyticsGateway } from "@/src/features/analytics/infrastructure/HttpAnalyticsGateway";
import {
  analyticsOption,
  analyticsRows,
  paletteRanks,
} from "@/src/features/analytics/presentation/analyticsChart";
import { useAnalytics } from "@/src/features/analytics/presentation/useAnalytics";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { NativeChart } from "@/src/features/charts/NativeChart";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

/** Refus métier de l'API, mêmes phrases que le Web ; non relancés. */
const BUSINESS_ERRORS = {
  ANALYTICS_RANGE_TOO_LARGE:
    "Trop de points à afficher pour cette période : réduisez la période ou choisissez un regroupement plus large.",
  ANALYTICS_QUERY_INVALID: "La date de début doit précéder la date de fin.",
};

/**
 * Explorateur d'analyses mobile (#215) : indicateur, regroupement et période
 * prédéfinie, graphique décoratif et liste textuelle équivalente.
 */
export const AnalyticsScreen = () => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpAnalyticsGateway(httpClient),
    [httpClient],
  );
  const [metric, setMetric] = useState<Metric>("expense");
  const [groupBy, setGroupBy] = useState<Grouping>("category");
  const [period, setPeriod] = useState<Period>("month");
  const range = resolvePeriod(period, parisToday());
  const problem = rangeProblem(range.from, range.to, groupBy);
  const query = toApiQuery(metric, groupBy, range);
  const analytics = useAnalytics(gateway, query, problem);

  // Couleurs de catégorie de l'accueil (#172) : rangs lus une fois. Le
  // résultat attend cette lecture (`settled`), comme sur le Web ; en cas
  // d'échec, la palette suit l'ordre d'affichage.
  const [palette, setPalette] = useState<{
    ranks: Map<number, number> | null;
    settled: boolean;
  }>({ ranks: null, settled: false });
  useEffect(() => {
    let isActive = true;
    new HttpOneOffOperationsGateway(httpClient)
      .listAllCategories()
      .then((categories) => {
        if (isActive)
          setPalette({ ranks: paletteRanks(categories), settled: true });
      })
      .catch(() => {
        if (isActive) setPalette({ ranks: null, settled: true });
      });
    return () => {
      isActive = false;
    };
  }, [httpClient]);

  const state =
    analytics.status === "success" && !palette.settled
      ? { ...analytics, status: "loading" as const }
      : analytics;
  const rows = useMemo(
    () =>
      state.data
        ? analyticsRows(state.data, metric, groupBy, palette.ranks, colors)
        : [],
    [groupBy, metric, palette.ranks, state.data],
  );
  const option = useMemo(
    () => analyticsOption(rows, groupBy, colors),
    [groupBy, rows],
  );
  const chartHeight = groupBy === "category" ? 48 + rows.length * 36 : 240;

  return (
    <SafeAreaView edges={TAB_SCREEN_EDGES} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            router.canGoBack() ? router.back() : router.navigate("/(app)")
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
        <Text style={styles.eyebrow}>BUDGET</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Analyses
        </Text>
        <Text style={styles.subtitle}>
          Explorez vos dépenses et entrées par catégorie ou dans le temps.
        </Text>

        <Text style={styles.label}>Indicateur</Text>
        <RadioGroup<Metric>
          choices={METRICS}
          disabled={false}
          label="Indicateur"
          value={metric}
          onChange={setMetric}
        />
        <Text style={styles.label}>Regrouper par</Text>
        <RadioGroup<Grouping>
          choices={GROUPINGS}
          disabled={false}
          label="Regrouper par"
          value={groupBy}
          onChange={setGroupBy}
        />
        <Text style={styles.label}>Période</Text>
        <RadioGroup<Period>
          choices={PERIODS}
          disabled={false}
          label="Période"
          value={period}
          onChange={setPeriod}
        />

        {state.status === "invalid" && problem ? (
          <FeedbackState
            description={problem}
            kind="error"
            title="Période refusée"
          />
        ) : null}
        {state.status === "loading" ? (
          <FeedbackState
            description="Le graphique est en cours de chargement."
            kind="loading"
            title="Chargement du graphique"
          />
        ) : null}
        {state.status === "error" ? (
          <FeedbackState
            // Un refus métier se reproduirait : seule l'erreur réseau se relance.
            actions={
              state.code == null
                ? [{ label: "Réessayer", onPress: state.retry }]
                : undefined
            }
            description={
              state.code == null
                ? "Le graphique n’a pas pu être chargé. Vérifiez votre connexion puis réessayez."
                : BUSINESS_ERRORS[state.code]
            }
            kind="error"
            title="Graphique indisponible"
          />
        ) : null}
        {state.status === "empty" ? (
          <FeedbackState
            description="Aucune opération sur cette période."
            icon="bar-chart-outline"
            kind="empty"
            title="Rien à afficher"
          />
        ) : null}
        {state.status === "success" ? (
          <View style={styles.card} testID="analytics-result">
            <NativeChart option={option} height={chartHeight} />
            <Text accessibilityRole="header" style={styles.listTitle}>
              Détail
            </Text>
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={[styles.swatch, { backgroundColor: row.color }]}
                />
                <Text style={styles.rowLabel}>{row.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
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
    marginTop: primitives.space["2"],
  },
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["2"],
    marginTop: primitives.space["3"],
    padding: primitives.space["4"],
  },
  listTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
    marginTop: primitives.space["2"],
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: primitives.space["2"],
  },
  swatch: {
    borderRadius: primitives.radius.pill,
    height: primitives.space["3"],
    width: primitives.space["3"],
  },
  rowLabel: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: primitives.fontSize.sm,
  },
});

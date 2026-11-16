import { useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RadioGroup } from "@/src/design/RadioGroup";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { BudgetSummary } from "@/src/features/budget/domain/budgetSummary";
import {
  REMAINING_PERIODS,
  RemainingComparison,
  RemainingPeriod,
  remainingComparison,
} from "@/src/features/budget/domain/theoreticalRemaining";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";
const bold = `${primitives.fontWeight.bold}` as "700";

const toneStyle = (cents: number | null) =>
  cents === null || cents === 0
    ? null
    : cents < 0
      ? styles.negative
      : styles.positive;

/** Phrase annoncée et lue pour le montant de la période. */
const amountLabel = (comparison: RemainingComparison) =>
  comparison.actual === null
    ? `${comparison.caption} : aucun montant, le mois est terminé.`
    : `${comparison.caption} : ${comparison.actual} sur ${comparison.theoretical} théorique.`;

/**
 * Reste à vivre actualisé comparé au théorique (#393, maquette A de #391) :
 * périodes Mois, Semaine et Jour, barre, écart, encadré « Ce mois-ci » et
 * accès au détail du calcul. Tous les montants viennent du résumé serveur.
 */
export const RemainingComparisonCard = ({
  summary,
  onShowDetail,
}: {
  summary: BudgetSummary;
  onShowDetail(): void;
}) => {
  const [period, setPeriod] = useState<RemainingPeriod>("month");
  const comparison = useMemo(
    () => remainingComparison(summary, period),
    [summary, period],
  );
  const month = useMemo(() => remainingComparison(summary, "month"), [summary]);

  const choose = (next: RemainingPeriod) => {
    setPeriod(next);
    AccessibilityInfo.announceForAccessibility(
      amountLabel(remainingComparison(summary, next)),
    );
  };

  return (
    <View style={styles.card} testID="remaining-comparison">
      <RadioGroup
        choices={REMAINING_PERIODS}
        disabled={false}
        label="Période du reste à vivre"
        onChange={choose}
        value={period}
      />
      <Text accessibilityRole="header" style={styles.caption}>
        {comparison.caption}
      </Text>
      <View
        accessibilityLabel={amountLabel(comparison)}
        accessible
        style={styles.amounts}
      >
        <Text style={[styles.amount, toneStyle(comparison.actualCents)]}>
          {comparison.actual ?? "—"}
        </Text>
        {/* Mois terminé : pas de part à comparer, seul « — » reste. */}
        {comparison.theoretical === null ? null : (
          <Text style={styles.theoretical}>
            {`/ ${comparison.theoretical} théorique`}
          </Text>
        )}
      </View>
      {comparison.progress !== null ? (
        <View
          accessibilityLabel={comparison.progressLabel ?? undefined}
          accessibilityRole="progressbar"
          accessible
          // Props `aria-*` : exposées aussi par l'export Web, comme `RadioGroup`.
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={comparison.progress}
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${comparison.progress}%` }]} />
        </View>
      ) : null}
      {comparison.difference ? (
        <Text style={styles.difference}>{comparison.difference}</Text>
      ) : null}
      {comparison.help ? (
        <Text style={styles.help}>{comparison.help}</Text>
      ) : null}

      <View
        accessibilityLabel={`Ce mois-ci. Actualisé ${month.actual}. Théorique ${month.theoretical}. Le théorique correspond aux revenus fixes moins les charges fixes.`}
        accessible
        style={styles.month}
        testID="remaining-this-month"
      >
        <Text style={styles.monthTitle}>Ce mois-ci</Text>
        <View style={styles.monthValues}>
          <View style={styles.monthValue}>
            <Text style={styles.monthLabel}>Actualisé</Text>
            <Text style={[styles.monthAmount, toneStyle(month.actualCents)]}>
              {month.actual}
            </Text>
          </View>
          <View style={styles.monthValue}>
            <Text style={styles.monthLabel}>Théorique</Text>
            <Text style={[styles.monthAmount, styles.muted]}>
              {month.theoretical}
            </Text>
          </View>
        </View>
        <Text style={styles.help}>
          Le théorique correspond aux revenus fixes moins les charges fixes.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onShowDetail}
        style={({ pressed }) => [styles.detailLink, pressed && styles.pressed]}
      >
        <Text style={styles.detailLabel}>Voir le détail du calcul</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["3"],
    padding: primitives.space["5"],
    shadowColor: semantic.shadow.card.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  amounts: {
    alignItems: "baseline",
    columnGap: primitives.space["2"],
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amount: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: bold,
  },
  theoretical: {
    color: colors.textMuted,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
  },
  positive: { color: colors.dataIncome },
  negative: { color: colors.statusErrorText },
  muted: { color: colors.textMuted },
  track: {
    backgroundColor: colors.borderSubtle,
    borderRadius: primitives.radius.pill,
    height: primitives.space["2"],
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.dataIncome,
    borderRadius: primitives.radius.pill,
    height: "100%",
  },
  difference: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  help: {
    color: colors.textMuted,
    fontSize: primitives.fontSize.sm,
    lineHeight: 19,
  },
  month: {
    backgroundColor: colors.backgroundCanvas,
    borderRadius: semantic.radius.control,
    gap: primitives.space["2"],
    padding: primitives.space["3"],
  },
  monthTitle: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    fontWeight: bold,
  },
  monthValues: {
    columnGap: primitives.space["3"],
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: primitives.space["2"],
  },
  monthValue: { flexBasis: 120, flexGrow: 1, gap: primitives.space["1"] },
  monthLabel: { color: colors.textMuted, fontSize: primitives.fontSize.sm },
  monthAmount: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: bold,
  },
  detailLink: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
  },
  detailLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.7 },
});

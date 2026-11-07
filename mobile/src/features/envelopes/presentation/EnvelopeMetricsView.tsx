import { StyleSheet, Text, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  EnvelopeMetrics,
  envelopeStatusLabel,
  formatEnvelopeMoney,
  meterValue,
  percentLabel,
} from "@/src/features/envelopes/domain/budgetEnvelope";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

interface Props {
  metrics: EnvelopeMetrics;
  currency: string;
}

/**
 * Prévu, dépensé, progression et état d'une enveloppe (#384). La jauge est
 * plafonnée à 100 % ; le pourcentage réel et le dépassement restent écrits.
 */
export const EnvelopeMetricsView = ({ metrics, currency }: Props) => {
  const actual = formatEnvelopeMoney(metrics.actual, currency);
  const planned = formatEnvelopeMoney(metrics.planned, currency);
  const exceeded = metrics.status === "EXCEEDED";
  const percent = percentLabel(metrics.progress);
  const meter = meterValue(metrics.progress);

  return (
    <View style={styles.metrics}>
      <Text style={styles.amounts}>
        <Text style={styles.actual}>{actual}</Text> sur {planned} prévus
      </Text>
      <View
        accessible
        accessibilityLabel="Budget consommé"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: meter, text: percent }}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={meter}
        aria-valuetext={percent}
        style={styles.track}
      >
        <View
          style={[
            styles.fill,
            exceeded && styles.fillExceeded,
            { width: `${meter}%` },
          ]}
        />
      </View>
      <Text style={styles.percent}>{percent}</Text>
      <Text style={[styles.status, exceeded && styles.overrun]}>
        {envelopeStatusLabel(metrics, currency)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  metrics: { gap: primitives.space["2"] },
  amounts: { color: colors.textSecondary, fontSize: primitives.fontSize.md },
  actual: { color: colors.textPrimary, fontWeight: semibold },
  track: {
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: primitives.radius.pill,
    height: 10,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: primitives.radius.pill,
    height: "100%",
  },
  fillExceeded: { backgroundColor: colors.statusErrorText },
  percent: { color: colors.textSecondary, fontSize: primitives.fontSize.sm },
  status: {
    color: colors.statusSuccessText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  overrun: { color: colors.statusErrorText },
});

export const envelopeCardStyle = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["3"],
    padding: primitives.space["4"],
  },
}).card;

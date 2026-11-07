import { StyleSheet, Text, View } from "react-native";

import { primitives, themes } from "@/src/design/tokens";
import {
  EnvelopeStatistics,
  formatEnvelopeMoney,
  percentLabel,
  statisticsSampleLabel,
} from "@/src/features/envelopes/domain/budgetEnvelope";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const money = (value: string | null, currency: string, signed = false) =>
  value === null ? "—" : formatEnvelopeMoney(value, currency, signed);

/** Ligne « libellé : valeur », lue en un seul arrêt. */
const Fact = ({ label, value }: { label: string; value: string }) => (
  <View
    accessible
    accessibilityLabel={`${label} : ${value}`}
    style={styles.fact}
  >
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

/** Moyennes d'une enveloppe, mêmes libellés que le Web (#314). */
export const EnvelopeStatisticsView = ({
  statistics: s,
  currency,
}: {
  statistics: EnvelopeStatistics;
  currency: string;
}) => (
  <View style={styles.statistics}>
    {s.sampleMonths === 0 ? (
      <Text style={styles.text}>
        Pas encore de mois terminé avec des dépenses rattachées pour calculer
        une moyenne.
      </Text>
    ) : (
      <>
        <Fact
          label="Dépense réelle moyenne / mois"
          value={money(s.meanActual, currency)}
        />
        <Fact
          label="Budget moyen / mois"
          value={money(s.meanPlanned, currency)}
        />
        <Fact
          label="Écart moyen au budget"
          value={money(s.meanVariance, currency, true)}
        />
        <Fact
          label="Dépassement positif moyen / mois"
          value={money(s.meanOverrun, currency)}
        />
        <Text style={styles.text}>
          Budget dépassé {s.exceededMonths} mois sur {s.sampleMonths} (
          {percentLabel(s.overrunRate)}).
        </Text>
      </>
    )}
    <Text style={styles.help}>{statisticsSampleLabel(s)}</Text>
  </View>
);

const styles = StyleSheet.create({
  statistics: { gap: primitives.space["2"] },
  fact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "space-between",
  },
  factLabel: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: primitives.fontSize.sm,
  },
  factValue: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  text: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
  help: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
});

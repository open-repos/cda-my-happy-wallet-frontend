import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { semantic, themes } from "@/src/design/tokens";
import { FeedbackState } from "@/src/design/FeedbackState";
import {
  AmountTone,
  buildSummaryCards,
} from "@/src/features/budget/domain/budgetSummary";
import { BudgetSummaryGateway } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
import { useBudgetSummary } from "@/src/features/budget/presentation/useBudgetSummary";

const colors = themes.light.color;

const toneStyle = (tone: AmountTone) =>
  tone === "negative"
    ? styles.negative
    : tone === "positive"
      ? styles.positive
      : null;

interface CardProps {
  accessibilityLabel: string;
  children?: React.ReactNode;
  title: string;
  amount: string;
  tone: AmountTone;
}

/** Carte lue d'un seul bloc par les lecteurs d'écran (libellé complet). */
const SummaryCard = ({
  accessibilityLabel,
  amount,
  children,
  title,
  tone,
}: CardProps) => (
  <View accessibilityLabel={accessibilityLabel} accessible style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={[styles.amount, toneStyle(tone)]}>{amount}</Text>
    {children}
  </View>
);

/** Synthèse du mois : reste réel, prévisionnel et disponible prudent par jour. */
export const BudgetSummaryCards = ({
  gateway,
}: {
  gateway: BudgetSummaryGateway;
}) => {
  const { retry, status, summary } = useBudgetSummary(gateway);
  const cards = useMemo(
    () => (summary ? buildSummaryCards(summary) : null),
    [summary],
  );

  if (status === "loading" && cards === null) {
    return (
      <FeedbackState
        description="La synthèse de votre mois est en cours de chargement."
        kind="loading"
        title="Calcul de votre reste à vivre"
      />
    );
  }
  if (status === "error" || cards === null) {
    return (
      <FeedbackState
        actions={[{ label: "Réessayer", onPress: () => void retry() }]}
        description="Vérifiez votre connexion puis relancez le chargement."
        kind="error"
        title="Synthèse indisponible"
      />
    );
  }

  const { forecast, prudent, real } = cards;
  return (
    <View style={styles.cards}>
      <SummaryCard
        accessibilityLabel={real.accessibilityLabel}
        amount={real.amount}
        title="Reste réel"
        tone={real.tone}
      >
        {real.carry ? (
          <View style={styles.carry}>
            <Text style={styles.carryText}>{real.carry.label}</Text>
            <Text style={styles.carryText}>{real.carry.amount}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Résultat du mois</Text>
          <Text style={[styles.rowValue, toneStyle(real.monthResultTone)]}>
            {real.monthResult}
          </Text>
        </View>
        <Text style={styles.help}>{real.help}</Text>
      </SummaryCard>
      {forecast ? (
        <SummaryCard
          accessibilityLabel={forecast.accessibilityLabel}
          amount={forecast.amount}
          title="Reste prévisionnel"
          tone={forecast.tone}
        >
          {forecast.lines.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
          {forecast.overdue ? (
            <Text style={styles.warning}>{forecast.overdue}</Text>
          ) : null}
        </SummaryCard>
      ) : null}
      {prudent ? (
        <SummaryCard
          accessibilityLabel={prudent.accessibilityLabel}
          amount={prudent.amount}
          title="Disponible prudent par jour"
          tone={prudent.tone}
        >
          <Text style={styles.help}>{prudent.help}</Text>
        </SummaryCard>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  cards: { gap: 12 },
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 20,
    shadowColor: semantic.shadow.card.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  cardTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: "600" },
  amount: { color: colors.textPrimary, fontSize: 30, fontWeight: "700" },
  positive: { color: colors.dataIncome },
  negative: { color: colors.statusErrorText },
  carry: {
    backgroundColor: colors.statusInfoSurface,
    borderLeftColor: colors.dataForecast,
    borderLeftWidth: 3,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  carryText: { color: colors.statusInfoText, fontSize: 14, fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  help: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  warning: { color: colors.statusWarningText, fontSize: 14, fontWeight: "600" },
});

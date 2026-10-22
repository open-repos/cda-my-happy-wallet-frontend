import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import { SUSTAINABILITY } from "@/src/features/savings/domain/savingsCapacity";
import { HttpSavingsCapacityGateway } from "@/src/features/savings/infrastructure/HttpSavingsCapacityGateway";
import { useSavingsCapacity } from "@/src/features/savings/presentation/useSavingsCapacity";

interface SavingsCapacitySectionProps {
  /**
   * Ouvre directement l'objectif dans l'onglet Objectifs ; sans elle, le
   * bouton y mène avec `ajuster=<id>` (accueil).
   */
  onAdjust?(goalId: number): void;
  /** Change quand les objectifs changent : actualisation discrète. */
  refreshKey?: string;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const formatMoney = (amount: string | null, currency: string) =>
  amount === null
    ? "Non calculable"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(
        Number(amount),
      );
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));

/**
 * Ouvre l'onglet Objectifs sur l'objectif à ajuster. Jeton unique : ajuster
 * deux fois le même objectif rouvre le formulaire (onglets montés, URL sinon
 * identique). Appelé au toucher, jamais pendant le rendu.
 */
const adjustGoal = (goalId: number, router: ReturnType<typeof useRouter>) =>
  router.push({
    pathname: "/(app)/goals",
    params: { ajuster: `${goalId}`, demande: `${Date.now()}` },
  });

/** Ligne « libellé : montant », lue en un seul arrêt par les lecteurs d'écran. */
const Fact = ({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) => (
  <View
    accessible
    accessibilityLabel={`${label} : ${value}`}
    style={styles.fact}
  >
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={[styles.factValue, negative && styles.negative]}>{value}</Text>
  </View>
);

/** Capacité d'épargne du mois et effort de chaque objectif (#217). */
export const SavingsCapacitySection = ({
  onAdjust,
  refreshKey = "",
}: SavingsCapacitySectionProps) => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpSavingsCapacityGateway(httpClient),
    [httpClient],
  );
  const from = currentParisMonth();
  const state = useSavingsCapacity(gateway, from, refreshKey);
  const data = state.data;
  const month = data?.months[0];
  const adjust = (goalId: number) =>
    onAdjust != null ? onAdjust(goalId) : adjustGoal(goalId, router);

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Capacité d’épargne
      </Text>
      {state.status === "loading" ? (
        <FeedbackState
          description="Chargement de la capacité d’épargne…"
          kind="loading"
          title="Chargement"
        />
      ) : null}
      {state.status === "error" ? (
        <FeedbackState
          actions={[
            {
              accessibilityLabel: "Réessayer la capacité d’épargne",
              label: "Réessayer",
              onPress: state.retry,
            },
          ]}
          description="La capacité d’épargne n’a pas pu être chargée. Réessayez pour obtenir une synthèse à jour."
          kind="error"
          title="Capacité d’épargne indisponible"
        />
      ) : null}
      {state.status === "success" && data && month ? (
        <View style={styles.card}>
          <Text style={styles.help}>
            Prévision de {monthLabel(from)}. Les versements prévus sont réservés
            dans le budget ; ils ne modifient pas l’épargne déclarée.
          </Text>
          {(
            [
              [
                "Versements prévus par mois",
                data.totalPlannedMonthlyContribution,
              ],
              [
                "Versements requis par mois",
                data.totalRequiredMonthlyContribution,
              ],
              ["Reste avant objectifs", month.beforeGoals],
              ["Reste après versements requis", month.afterRequired],
              ["Disponible par mois après objectifs", data.allowances.monthly],
              [
                "Disponible par semaine après objectifs",
                data.allowances.weekly,
              ],
              ["Disponible par jour après objectifs", data.allowances.daily],
            ] as [string, string | null][]
          ).map(([label, value]) => (
            <Fact
              key={label}
              label={label}
              negative={value !== null && Number(value) < 0}
              value={formatMoney(value, data.currency)}
            />
          ))}
          <Text style={styles.indicator}>
            <Text style={styles.indicatorName}>
              {SUSTAINABILITY[month.sustainability][0]}
            </Text>{" "}
            — {SUSTAINABILITY[month.sustainability][1]}
          </Text>
          <Text style={styles.help}>
            Indicateur arithmétique sur les données saisies, sans conseil
            financier ni garantie de paiement dans le mois. Le jour répartit le
            reste sur {data.allowances.remainingDays} jours restants ; la
            semaine couvre au plus sept jours.
          </Text>
          {data.goals.length === 0 ? (
            <Text style={styles.help}>
              Aucun objectif actif à prendre en compte.
            </Text>
          ) : (
            data.goals.map((goal) => (
              <View key={goal.id} style={styles.goal}>
                <Text accessibilityRole="header" style={styles.goalTitle}>
                  {goal.title}
                </Text>
                <Fact
                  label="Versement prévu"
                  value={formatMoney(
                    goal.plannedMonthlyContribution,
                    data.currency,
                  )}
                />
                <Fact
                  label="Versement requis pour tenir la date"
                  value={formatMoney(
                    goal.requiredMonthlyContribution,
                    data.currency,
                  )}
                />
                <Fact
                  label="Écart requis − prévu"
                  value={formatMoney(
                    goal.monthlyContributionGap,
                    data.currency,
                  )}
                />
                {!goal.includedInTotals ? (
                  <Text style={styles.help}>
                    Exclu des totaux : aucun versement mensuel prévu.
                  </Text>
                ) : null}
                <Pressable
                  accessibilityLabel={`Ajuster le versement pour ${goal.title}`}
                  accessibilityRole="button"
                  onPress={() => adjust(goal.id)}
                  style={({ pressed }) => [
                    styles.adjustButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.adjustLabel}>Ajuster le versement</Text>
                </Pressable>
              </View>
            ))
          )}
          {data.goals.length > 0 ? (
            <Text style={styles.help}>
              Un écart positif indique un versement manquant pour la date ; un
              écart négatif indique un excédent prévu. Sans échéance future, le
              requis et l’écart sont non calculables.
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: primitives.space["3"] },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
  },
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["2"],
    padding: primitives.space["4"],
  },
  help: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
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
  negative: { color: colors.statusErrorText },
  indicator: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    lineHeight: 22,
    marginTop: primitives.space["2"],
  },
  indicatorName: { fontWeight: semibold },
  goal: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: semantic.borderWidth.default,
    gap: primitives.space["2"],
    marginTop: primitives.space["2"],
    paddingTop: primitives.space["3"],
  },
  goalTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  adjustButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  adjustLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.8 },
});

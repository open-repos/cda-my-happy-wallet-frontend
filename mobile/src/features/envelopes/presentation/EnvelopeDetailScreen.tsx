import Ionicons from "@expo/vector-icons/Ionicons";
import { useFabClearance } from "@/src/features/quick-add/presentation/useFabClearance";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FeedbackState } from "@/src/design/FeedbackState";
import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  envelopeStatusLabel,
  formatEnvelopeMoney,
} from "@/src/features/envelopes/domain/budgetEnvelope";
import { HttpEnvelopesGateway } from "@/src/features/envelopes/infrastructure/HttpEnvelopesGateway";
import {
  EnvelopeMetricsView,
  envelopeCardStyle,
} from "@/src/features/envelopes/presentation/EnvelopeMetricsView";
import { envelopeStyles } from "@/src/features/envelopes/presentation/EnvelopeSection";
import { EnvelopeStatisticsView } from "@/src/features/envelopes/presentation/EnvelopeStatisticsView";
import {
  longDate,
  monthLabel,
  operationCountLabel,
} from "@/src/features/envelopes/presentation/envelopeFormat";
import { useAsyncValue } from "@/src/features/envelopes/presentation/useAsyncValue";
import { usePagedCollection } from "@/src/features/envelopes/presentation/usePagedCollection";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const positiveId = (value: string | string[] | undefined) =>
  typeof value === "string" && /^[1-9]\d{0,9}$/.test(value)
    ? Number(value)
    : null;

const loadedMessage = (count: number) =>
  `${count} dépense${count > 1 ? "s" : ""} chargée${count > 1 ? "s" : ""}.`;

/**
 * Détail d'une enveloppe du mois (#384) : indicateurs de l'occurrence,
 * dépenses rattachées et statistiques de l'année, en lecture seule.
 */
export const EnvelopeDetailScreen = () => {
  // Fin de page dégagée du bouton flottant d’ajout (#407).
  const fabSpace = useFabClearance(primitives.space["16"]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    enveloppe?: string;
    occurrence?: string;
  }>();
  const occurrenceId = positiveId(params.occurrence);
  const envelopeId = positiveId(params.enveloppe);
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpEnvelopesGateway(httpClient),
    [httpClient],
  );

  const loadOccurrence = useMemo(
    () =>
      occurrenceId === null ? null : () => gateway.occurrence(occurrenceId),
    [gateway, occurrenceId],
  );
  const occurrence = useAsyncValue(loadOccurrence);
  const value = occurrence.value;

  const loadPayments = useCallback(
    (cursor: string | null) =>
      occurrenceId === null
        ? Promise.reject(new Error("Missing occurrence"))
        : gateway.payments(occurrenceId, cursor),
    [gateway, occurrenceId],
  );
  const payments = usePagedCollection(loadPayments, loadedMessage);

  const year = value?.month.slice(0, 4) ?? null;
  const loadStatistics = useMemo(
    () =>
      envelopeId === null || year === null
        ? null
        : () => gateway.yearStatistics(envelopeId, year),
    [envelopeId, gateway, year],
  );
  const statistics = useAsyncValue(loadStatistics);

  // L'état de l'enveloppe, dépassement compris, est annoncé à l'ouverture.
  useEffect(() => {
    if (value === null) return;
    AccessibilityInfo.announceForAccessibility(
      `${value.title} · ${monthLabel(value.month)}. ${envelopeStatusLabel(
        value.metrics,
        value.currency,
      )}`,
    );
  }, [value]);

  const back = () =>
    router.canGoBack() ? router.back() : router.navigate("/(app)");

  return (
    <SafeAreaView edges={TAB_SCREEN_EDGES} style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, fabSpace]}>
        <Pressable
          accessibilityRole="link"
          onPress={back}
          style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
        >
          <Ionicons
            color={colors.actionSecondaryText}
            name="chevron-back"
            size={20}
          />
          <Text style={styles.backLabel}>Retour aux enveloppes</Text>
        </Pressable>
        <Text style={styles.eyebrow}>ENVELOPPE</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {value ? `${value.title} · ${monthLabel(value.month)}` : "Enveloppe"}
        </Text>

        {occurrenceId === null ? (
          <FeedbackState
            description="Ce lien ne désigne aucune enveloppe. Revenez à l’accueil pour en choisir une."
            kind="error"
            title="Enveloppe introuvable"
          />
        ) : null}
        {occurrenceId !== null && occurrence.status === "loading" ? (
          <FeedbackState
            description="Chargement de l’enveloppe…"
            kind="loading"
            title="Chargement"
          />
        ) : null}
        {occurrence.status === "error" ? (
          <FeedbackState
            actions={[
              {
                accessibilityLabel: "Réessayer l’enveloppe",
                label: "Réessayer",
                onPress: occurrence.retry,
              },
            ]}
            description="Impossible de charger l’enveloppe. Réessayez."
            kind="error"
            title="Enveloppe indisponible"
          />
        ) : null}

        {occurrence.status === "success" && value ? (
          <>
            <View style={envelopeCardStyle}>
              <EnvelopeMetricsView
                currency={value.currency}
                metrics={value.metrics}
              />
              <Text style={styles.help}>
                {operationCountLabel(value.operationCount)}
                {value.closed
                  ? ". Mois clôturé : consultation seule, les rattachements sont protégés."
                  : "."}
              </Text>
            </View>

            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Dépenses rattachées
            </Text>
            {payments.status === "loading" ? (
              <FeedbackState
                description="Chargement des dépenses rattachées…"
                kind="loading"
                title="Chargement"
              />
            ) : null}
            {payments.status === "error" ? (
              <FeedbackState
                actions={[
                  {
                    accessibilityLabel: "Réessayer les dépenses rattachées",
                    label: "Réessayer",
                    onPress: payments.retry,
                  },
                ]}
                description="Les dépenses rattachées n’ont pas pu être chargées. Réessayez."
                kind="error"
                title="Dépenses indisponibles"
              />
            ) : null}
            {payments.status === "success" && payments.rows.length === 0 ? (
              <FeedbackState
                description="Aucune dépense n’est encore rattachée à cette enveloppe."
                icon="receipt-outline"
                kind="empty"
                title="Aucune dépense"
              />
            ) : null}
            {payments.status === "success" && payments.rows.length > 0 ? (
              <View style={envelopeCardStyle}>
                {payments.rows.map((payment, index) => (
                  <View
                    accessible
                    key={payment.id}
                    style={[styles.payment, index === 0 && styles.first]}
                  >
                    <View style={styles.paymentCopy}>
                      <Text style={styles.paymentTitle}>{payment.title}</Text>
                      <Text style={styles.help}>
                        {longDate(payment.operationDate)}
                      </Text>
                    </View>
                    <Text style={styles.paymentAmount}>
                      {formatEnvelopeMoney(payment.amount, payment.currency)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {payments.status === "success" && payments.hasNext ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  busy: payments.paging,
                  disabled: payments.paging,
                }}
                disabled={payments.paging}
                onPress={payments.loadMore}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonLabel}>
                  {payments.paging
                    ? "Chargement…"
                    : "Afficher la suite des dépenses"}
                </Text>
              </Pressable>
            ) : null}
            {payments.pagingError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                La suite des dépenses n’a pas pu être chargée. Réessayez.
              </Text>
            ) : null}

            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {`Statistiques ${year}`}
            </Text>
            {statistics.status === "loading" ? (
              <FeedbackState
                description="Chargement des moyennes…"
                kind="loading"
                title="Chargement"
              />
            ) : null}
            {statistics.status === "error" ? (
              <FeedbackState
                actions={[
                  {
                    accessibilityLabel: "Réessayer les moyennes",
                    label: "Réessayer",
                    onPress: statistics.retry,
                  },
                ]}
                description="Les moyennes de l’enveloppe n’ont pas pu être chargées. Réessayez."
                kind="error"
                title="Moyennes indisponibles"
              />
            ) : null}
            {statistics.status === "idle" ? (
              <Text style={styles.help}>
                Statistiques indisponibles : ouvrez l’enveloppe depuis
                l’accueil.
              </Text>
            ) : null}
            {statistics.status === "success" ? (
              <View style={envelopeCardStyle}>
                {statistics.value ? (
                  <EnvelopeStatisticsView
                    currency={value.currency}
                    statistics={statistics.value}
                  />
                ) : (
                  <Text style={styles.help}>
                    Aucun historique de cette enveloppe pour cette année.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  ...envelopeStyles,
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
  eyebrow: {
    color: colors.accent,
    fontSize: primitives.fontSize.xs,
    fontWeight: semibold,
  },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: semibold,
  },
  first: { borderTopWidth: 0, paddingTop: 0 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
    marginTop: primitives.space["2"],
  },
});

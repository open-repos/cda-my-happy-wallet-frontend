import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import { CategoryMark } from "@/src/features/categories/presentation/CategoryMark";
import {
  EnvelopeOverview,
  formatEnvelopeMoney,
} from "@/src/features/envelopes/domain/budgetEnvelope";
import { HttpEnvelopesGateway } from "@/src/features/envelopes/infrastructure/HttpEnvelopesGateway";
import {
  EnvelopeMetricsView,
  envelopeCardStyle,
} from "@/src/features/envelopes/presentation/EnvelopeMetricsView";
import {
  longDate,
  monthLabel,
  operationCountLabel,
} from "@/src/features/envelopes/presentation/envelopeFormat";
import { usePagedCollection } from "@/src/features/envelopes/presentation/usePagedCollection";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";
const TAG_MARK = { color: null, icon: "solid:tag" };

const loadedMessage = (count: number) =>
  `${count} enveloppe${count > 1 ? "s" : ""} chargée${count > 1 ? "s" : ""}.`;

const EnvelopeCard = ({
  envelope,
  onOpen,
}: {
  envelope: EnvelopeOverview;
  onOpen(occurrenceId: number): void;
}) => (
  <View style={envelopeCardStyle}>
    <View style={styles.cardHeading}>
      <Text accessibilityRole="header" style={styles.cardTitle}>
        {envelope.title}
      </Text>
      <View style={styles.category}>
        <CategoryMark category={envelope.category ?? TAG_MARK} size={14} />
        <Text style={styles.help}>
          {envelope.category?.name ?? "Sans catégorie"}
        </Text>
      </View>
    </View>
    <EnvelopeMetricsView
      currency={envelope.currency}
      metrics={envelope.totals}
    />
    <Text style={styles.help}>
      {operationCountLabel(envelope.totals.operationCount)}
    </Text>
    {envelope.months.map((month) => (
      <View key={month.occurrenceId} style={styles.month}>
        {month.paymentsPreview.map((payment) => (
          <View accessible key={payment.id} style={styles.payment}>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>{payment.title}</Text>
              <Text style={styles.help}>{longDate(payment.operationDate)}</Text>
            </View>
            <Text style={styles.paymentAmount}>
              {formatEnvelopeMoney(payment.amount, envelope.currency)}
            </Text>
          </View>
        ))}
        <Pressable
          accessibilityLabel={`Voir les dépenses de ${envelope.title} (${month.operationCount})`}
          accessibilityRole="button"
          onPress={() => onOpen(month.occurrenceId)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>
            Voir les dépenses ({month.operationCount})
          </Text>
        </Pressable>
      </View>
    ))}
  </View>
);

/** Enveloppes du mois à l'accueil (#384), comme « Mes enveloppes » du Web. */
export const EnvelopeSection = () => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpEnvelopesGateway(httpClient),
    [httpClient],
  );
  const month = currentParisMonth();
  const load = useCallback(
    (cursor: string | null) => gateway.overview(month, cursor),
    [gateway, month],
  );
  const list = usePagedCollection(load, loadedMessage);
  const open = (envelopeId: number, occurrenceId: number) =>
    router.push({
      pathname: "/(app)/envelope",
      params: { enveloppe: `${envelopeId}`, occurrence: `${occurrenceId}` },
    });

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Mes enveloppes
      </Text>
      <Text style={styles.help}>
        {`Dépenses réelles rattachées à vos budgets mensuels · ${monthLabel(month)}.`}
      </Text>
      {list.status === "loading" ? (
        <FeedbackState
          description="Chargement des enveloppes…"
          kind="loading"
          title="Chargement"
        />
      ) : null}
      {list.status === "error" ? (
        <FeedbackState
          actions={[
            {
              accessibilityLabel: "Réessayer les enveloppes",
              label: "Réessayer",
              onPress: list.retry,
            },
          ]}
          description="Impossible de charger les enveloppes. Réessayez."
          kind="error"
          title="Enveloppes indisponibles"
        />
      ) : null}
      {list.status === "success" && list.rows.length === 0 ? (
        <FeedbackState
          description="Aucune enveloppe suivie ce mois-ci. Pour démarrer, déclarez une charge fixe mensuelle comme enveloppe budgétaire depuis le site Web."
          icon="wallet-outline"
          kind="empty"
          title="Pas encore d’enveloppe"
        />
      ) : null}
      {list.status === "success"
        ? list.rows.map((envelope) => (
            <EnvelopeCard
              envelope={envelope}
              key={envelope.id}
              onOpen={(occurrenceId) => open(envelope.id, occurrenceId)}
            />
          ))
        : null}
      {list.status === "success" && list.hasNext ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: list.paging, disabled: list.paging }}
          disabled={list.paging}
          onPress={list.loadMore}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>
            {list.paging ? "Chargement…" : "Afficher la suite des enveloppes"}
          </Text>
        </Pressable>
      ) : null}
      {list.pagingError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          La suite des enveloppes n’a pas pu être chargée. Réessayez.
        </Text>
      ) : null}
      {list.status === "success" && list.rows.length > 0 ? (
        <Text style={styles.help}>
          Pendant le mois, le budget reste réservé jusqu’à son montant prévu. À
          la clôture, le réalisé rattaché le remplace. Sans dépense rattachée,
          le prévu reste réservé. Le solde mensuel intègre ce rapprochement.
        </Text>
      ) : null}
    </View>
  );
};

export const envelopeStyles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  buttonLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.8 },
  help: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
  error: {
    color: colors.statusErrorText,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  payment: {
    alignItems: "center",
    borderTopColor: colors.borderSubtle,
    borderTopWidth: semantic.borderWidth.default,
    flexDirection: "row",
    gap: primitives.space["3"],
    paddingVertical: primitives.space["2"],
  },
  paymentCopy: { flex: 1, gap: 2 },
  paymentTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
  },
  paymentAmount: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
});

const styles = StyleSheet.create({
  ...envelopeStyles,
  section: { gap: primitives.space["3"] },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
  },
  cardHeading: { gap: primitives.space["1"] },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
  },
  category: {
    alignItems: "center",
    flexDirection: "row",
    gap: primitives.space["2"],
  },
  month: { gap: primitives.space["2"] },
});

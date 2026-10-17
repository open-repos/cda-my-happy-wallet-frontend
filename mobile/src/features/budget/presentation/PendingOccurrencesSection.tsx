import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { semantic, themes } from "@/src/design/tokens";
import { longDate } from "@/src/features/budget/domain/budgetCalendar";
import {
  PendingOccurrence,
  occurrenceLabel,
  plannedAmount,
  splitPending,
} from "@/src/features/budget/domain/pendingOccurrence";

const colors = themes.light.color;

interface PendingOccurrencesSectionProps {
  busy: boolean;
  error: boolean;
  onRetry(): void;
  occurrences: PendingOccurrence[];
  selectedDate: string | null;
  onRealize(occurrence: PendingOccurrence): void;
  onCancel(occurrence: PendingOccurrence): void;
}

/**
 * File des événements à traiter : en retard d'abord puis à venir. Chaque
 * ligne annonce son contexte complet aux lecteurs d'écran et expose deux
 * actions ≥ 44 px.
 */
export const PendingOccurrencesSection = ({
  busy,
  error,
  onRetry,
  occurrences,
  selectedDate,
  onRealize,
  onCancel,
}: PendingOccurrencesSectionProps) => {
  const groups = useMemo(
    () => splitPending(occurrences, selectedDate),
    [occurrences, selectedDate],
  );
  const total = groups.overdue.length + groups.upcoming.length;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {selectedDate
          ? `Événements du ${longDate(selectedDate)}`
          : "Événements à traiter"}
      </Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            Les événements à traiter n’ont pas pu être chargés.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryLabel}>Réessayer</Text>
          </Pressable>
        </View>
      ) : total === 0 ? (
        <Text style={styles.empty}>Aucun événement à traiter.</Text>
      ) : (
        <View style={styles.groups}>
          {groups.overdue.length > 0 ? (
            <View style={styles.group}>
              <Text accessibilityRole="header" style={styles.groupTitle}>
                À traiter ({groups.overdue.length})
              </Text>
              {groups.overdue.map((item) => (
                <OccurrenceRow
                  busy={busy}
                  key={`${item.eventId}-${item.occurrenceDate}`}
                  occurrence={item}
                  onCancel={onCancel}
                  onRealize={onRealize}
                />
              ))}
            </View>
          ) : null}
          {groups.upcoming.length > 0 ? (
            <View style={styles.group}>
              <Text accessibilityRole="header" style={styles.groupTitle}>
                Prévus
              </Text>
              {groups.upcoming.map((item) => (
                <OccurrenceRow
                  busy={busy}
                  key={`${item.eventId}-${item.occurrenceDate}`}
                  occurrence={item}
                  onCancel={onCancel}
                  onRealize={onRealize}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

interface OccurrenceRowProps {
  busy: boolean;
  occurrence: PendingOccurrence;
  onRealize(occurrence: PendingOccurrence): void;
  onCancel(occurrence: PendingOccurrence): void;
}

const OccurrenceRow = ({
  busy,
  occurrence,
  onRealize,
  onCancel,
}: OccurrenceRowProps) => {
  const label = occurrenceLabel(occurrence);
  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[styles.card, occurrence.overdue && styles.overdue]}
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{occurrence.title}</Text>
        <Text
          style={[
            styles.amount,
            occurrence.kind === "ENTREE" ? styles.positive : styles.negative,
          ]}
        >
          {plannedAmount(occurrence)}
        </Text>
      </View>
      <Text style={styles.cardDate}>
        {longDate(occurrence.occurrenceDate)}
        {occurrence.overdue ? " · en retard" : ""}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Convertir ${occurrence.title} du ${longDate(
            occurrence.occurrenceDate,
          )} en opération`}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => onRealize(occurrence)}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            busy && styles.disabled,
            pressed && !busy && styles.pressed,
          ]}
        >
          <Text style={styles.primaryLabel}>Convertir en opération</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Annuler ${occurrence.title} du ${longDate(
            occurrence.occurrenceDate,
          )}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => onCancel(occurrence)}
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            busy && styles.disabled,
            pressed && !busy && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryLabel}>Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 12 },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
  empty: { color: colors.textMuted, fontSize: 14 },
  error: { color: colors.statusErrorText, fontSize: 14 },
  errorBox: { alignItems: "flex-start", gap: 8 },
  groups: { gap: 16 },
  group: { gap: 8 },
  groupTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  overdue: {
    borderColor: colors.statusWarningText,
    borderLeftWidth: 4,
  },
  cardHead: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  cardDate: { color: colors.textMuted, fontSize: 13 },
  amount: { fontSize: 16, fontWeight: "700" },
  positive: { color: colors.dataIncome },
  negative: { color: colors.statusErrorText },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  button: {
    alignItems: "center",
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButton: { backgroundColor: colors.actionPrimaryBackground },
  secondaryButton: {
    backgroundColor: colors.actionSecondaryBackground,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  primaryLabel: {
    color: colors.actionPrimaryText,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryLabel: {
    color: colors.actionSecondaryText,
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.85 },
});

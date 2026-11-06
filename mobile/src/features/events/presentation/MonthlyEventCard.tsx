import { ActionButton } from "@/src/design/ActionButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  MonthlyEvent,
  recurrenceLabel,
} from "@/src/features/events/domain/monthlyEvent";

interface MonthlyEventCardProps {
  event: MonthlyEvent;
  onEdit(event: MonthlyEvent): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const formatAmount = (event: MonthlyEvent): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: event.currency,
  }).format(Number(event.amount));

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );

/** Période lisible : « à partir du », « le » ou « du … au … ». */
const describePeriod = (event: MonthlyEvent): string => {
  if (event.recurrence === "AUCUNE") return `Le ${formatDate(event.startDate)}`;
  return event.endDate == null
    ? `À partir du ${formatDate(event.startDate)}`
    : `Du ${formatDate(event.startDate)} au ${formatDate(event.endDate)}`;
};

export const MonthlyEventCard = ({ event, onEdit }: MonthlyEventCardProps) => {
  const isIncome = event.kind === "ENTREE";
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={styles.title}>
            {event.title}
          </Text>
          <Text style={styles.meta}>
            {recurrenceLabel(event.recurrence)} · {describePeriod(event)}
          </Text>
        </View>
        <ActionButton
          action="edit"
          accessibilityLabel={`Modifier ${event.title}`}
          accessibilityRole="button"
          hitSlop={primitives.space["2"]}
          onPress={() => onEdit(event)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
        ></ActionButton>
      </View>
      <View style={styles.footer}>
        <View
          style={[
            styles.kind,
            isIncome ? styles.incomeKind : styles.expenseKind,
          ]}
        >
          <Ionicons
            color={isIncome ? colors.dataIncome : colors.dataExpense}
            name={isIncome ? "arrow-down" : "arrow-up"}
            size={15}
          />
          <Text
            style={[
              styles.kindLabel,
              isIncome ? styles.incomeText : styles.expenseText,
            ]}
          >
            {isIncome ? "Entrée" : "Dépense"}
          </Text>
        </View>
        <Text
          style={[
            styles.amount,
            isIncome ? styles.incomeText : styles.expenseText,
          ]}
        >
          {isIncome ? "+" : "−"} {formatAmount(event)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["4"],
    padding: primitives.space["4"],
  },
  heading: { flexDirection: "row", gap: primitives.space["3"] },
  titleBlock: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
  },
  meta: {
    color: colors.textMuted,
    fontSize: primitives.fontSize.sm,
    marginTop: primitives.space["1"],
  },
  editButton: {
    alignItems: "center",
    height: primitives.size.controlSm,
    justifyContent: "center",
    width: primitives.size.controlSm,
  },
  pressed: { opacity: 0.7 },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "space-between",
  },
  kind: {
    alignItems: "center",
    borderRadius: primitives.radius.pill,
    flexDirection: "row",
    gap: primitives.space["1"],
    paddingHorizontal: primitives.space["3"],
    paddingVertical: primitives.space["1"],
  },
  incomeKind: { backgroundColor: colors.statusSuccessSurface },
  expenseKind: { backgroundColor: colors.statusErrorSurface },
  kindLabel: { fontSize: primitives.fontSize.xs, fontWeight: semibold },
  amount: { fontSize: primitives.fontSize.xl, fontWeight: semibold },
  incomeText: { color: colors.dataIncome },
  expenseText: { color: colors.dataExpense },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  OneOffOperation,
  OperationCategory,
} from "@/src/features/operations/domain/oneOffOperation";

interface OperationCardProps {
  category?: OperationCategory;
  operation: OneOffOperation;
  onEdit(operation: OneOffOperation): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const formatAmount = (operation: OneOffOperation): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: operation.currency,
  }).format(Number(operation.amount));

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );

export const OperationCard = ({
  category,
  operation,
  onEdit,
}: OperationCardProps) => {
  const isIncome = operation.type === "ENTREE";
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={styles.title}>
            {operation.title}
          </Text>
          <Text style={styles.date}>{formatDate(operation.operationDate)}</Text>
        </View>
        <Pressable
          accessibilityLabel={`Modifier ${operation.title}`}
          accessibilityRole="button"
          hitSlop={primitives.space["2"]}
          onPress={() => onEdit(operation)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color={colors.textSecondary}
            name="create-outline"
            size={24}
          />
        </Pressable>
      </View>
      <View style={styles.details}>
        <View style={styles.category}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.swatch,
              { backgroundColor: category?.color ?? colors.borderSubtle },
            ]}
          />
          <Text numberOfLines={1} style={styles.categoryLabel}>
            {category?.name ?? "Catégorie indisponible"}
          </Text>
        </View>
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
      </View>
      <Text
        style={[
          styles.amount,
          isIncome ? styles.incomeText : styles.expenseText,
        ]}
      >
        {isIncome ? "+" : "−"} {formatAmount(operation)}
      </Text>
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
  date: {
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
  details: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "space-between",
  },
  category: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: primitives.space["2"],
  },
  swatch: {
    borderRadius: primitives.radius.pill,
    height: primitives.space["3"],
    width: primitives.space["3"],
  },
  categoryLabel: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: primitives.fontSize.sm,
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

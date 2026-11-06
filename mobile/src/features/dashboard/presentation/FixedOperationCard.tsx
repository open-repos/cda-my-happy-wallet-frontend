import { ActionButton } from "@/src/design/ActionButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { CategoryMark } from "@/src/features/categories/presentation/CategoryMark";
import {
  FixedOperation,
  fixedCategoryLabel,
} from "@/src/features/dashboard/domain/fixedBudget";

interface FixedOperationCardProps {
  operation: FixedOperation;
  onEdit(operation: FixedOperation): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";
/** En dessous, téléphone : montant sous le libellé et « Modifier » en icône. */
const COMPACT_MAX_WIDTH = 600;
/** Étiquette du Web pour une ligne sans catégorie lisible (#266). */
const TAG_MARK = { color: null, icon: "solid:tag" };

const formatAmount = (operation: FixedOperation): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: operation.currency,
  }).format(Number(operation.amount));

export const FixedOperationCard = ({
  operation,
  onEdit,
}: FixedOperationCardProps) => {
  const isIncome = operation.type === "REVENU";
  const compact = useWindowDimensions().width < COMPACT_MAX_WIDTH;
  const amount = (
    <Text
      style={[styles.amount, isIncome ? styles.incomeText : styles.expenseText]}
    >
      {isIncome ? "+" : "−"} {formatAmount(operation)}
    </Text>
  );
  return (
    <View style={styles.card}>
      <View
        style={[
          styles.icon,
          isIncome ? styles.incomeSurface : styles.expenseSurface,
        ]}
      >
        <Ionicons
          color={isIncome ? colors.dataIncome : colors.dataExpense}
          name={isIncome ? "arrow-down" : "arrow-up"}
          size={20}
        />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.title}>
          {operation.title}
        </Text>
        {compact ? amount : null}
        <View style={styles.categoryRow}>
          <CategoryMark category={operation.category ?? TAG_MARK} size={14} />
          <Text style={styles.category}>{fixedCategoryLabel(operation)}</Text>
        </View>
        <Text style={styles.caption}>
          {isIncome ? "Revenu mensuel" : "Charge mensuelle"}
        </Text>
      </View>
      {compact ? null : amount}
      <ActionButton
        action="edit"
        accessibilityLabel={`Modifier ${operation.title}`}
        accessibilityRole="button"
        hitSlop={primitives.space["2"]}
        iconOnly={compact}
        onPress={() => onEdit(operation)}
        style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
      ></ActionButton>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    flexDirection: "row",
    gap: primitives.space["3"],
    padding: primitives.space["4"],
  },
  icon: {
    alignItems: "center",
    borderRadius: primitives.radius.pill,
    height: primitives.size.controlSm,
    justifyContent: "center",
    width: primitives.size.controlSm,
  },
  incomeSurface: { backgroundColor: colors.statusSuccessSurface },
  expenseSurface: { backgroundColor: colors.statusErrorSurface },
  copy: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  categoryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: primitives.space["1"],
    marginTop: primitives.space["1"],
  },
  category: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: primitives.fontSize.sm,
  },
  caption: {
    color: colors.textMuted,
    fontSize: primitives.fontSize.xs,
    marginTop: primitives.space["1"],
  },
  amount: { fontSize: primitives.fontSize.md, fontWeight: semibold },
  incomeText: { color: colors.dataIncome },
  expenseText: { color: colors.dataExpense },
  edit: {
    alignItems: "center",
    height: primitives.size.controlSm,
    justifyContent: "center",
    width: primitives.size.controlSm,
  },
  pressed: { opacity: 0.7 },
});

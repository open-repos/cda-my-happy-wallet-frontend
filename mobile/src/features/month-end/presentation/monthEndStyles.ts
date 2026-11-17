import { StyleSheet } from "react-native";

import { primitives, semantic } from "@/src/design/tokens";
import { vaultColors as colors } from "@/src/features/vault/presentation/vaultStyles";

const semibold = `${primitives.fontWeight.semibold}` as "600";

export { colors as monthEndColors };

/** Styles propres à la fin de mois (#420), sur les tokens du design system. */
export const monthEndStyles = StyleSheet.create({
  banner: {
    backgroundColor: colors.statusInfoSurface,
    borderColor: colors.statusInfoText,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["2"],
    padding: primitives.space["4"],
  },
  warning: {
    backgroundColor: colors.statusWarningSurface,
    borderColor: colors.statusWarningText,
  },
  bannerTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
  },
  reminder: {
    alignItems: "center",
    backgroundColor: colors.statusInfoSurface,
    borderRadius: semantic.radius.control,
    columnGap: primitives.space["3"],
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: primitives.space["3"],
  },
  reminderText: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: primitives.radius.pill,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
    overflow: "hidden",
    paddingHorizontal: primitives.space["3"],
    paddingVertical: primitives.space["1"],
  },
  tagPending: {
    backgroundColor: colors.statusWarningSurface,
    color: colors.statusWarningText,
  },
  tagNeutral: {
    backgroundColor: colors.actionSecondaryBackground,
    color: colors.textPrimary,
  },
  tagOk: {
    backgroundColor: colors.statusSuccessSurface,
    color: colors.statusSuccessText,
  },
  calc: { gap: primitives.space["2"] },
  calcRow: {
    alignItems: "baseline",
    columnGap: primitives.space["3"],
    flexDirection: "row",
    justifyContent: "space-between",
  },
  // Le libellé se replie ; le montant reste entier, aligné à droite.
  calcLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: primitives.fontSize.md,
  },
  calcAmount: {
    color: colors.textPrimary,
    flexShrink: 0,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
    textAlign: "right",
  },
  calcHint: { color: colors.textSecondary, fontSize: primitives.fontSize.sm },
  calcDetail: { paddingLeft: primitives.space["4"] },
  calcDetailText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: primitives.fontSize.sm,
  },
  calcTotal: {
    borderTopColor: colors.borderSubtle,
    borderTopWidth: semantic.borderWidth.default,
    paddingTop: primitives.space["2"],
  },
  strong: { fontWeight: semibold },
  previous: {
    color: colors.textSecondary,
    textDecorationLine: "line-through",
  },
  positive: { color: colors.statusSuccessText },
  negative: { color: colors.statusErrorText },
  choice: {
    backgroundColor: colors.fieldBackground,
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["1"],
    minHeight: semantic.size.controlMinHeight,
    padding: primitives.space["3"],
  },
  choiceSelected: {
    backgroundColor: colors.actionSecondaryBackground,
    borderColor: colors.borderStrong,
    borderWidth: semantic.borderWidth.focus,
  },
  label: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  input: {
    backgroundColor: colors.fieldBackground,
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    color: colors.fieldText,
    flex: 1,
    fontSize: primitives.fontSize.md,
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  invalid: {
    borderColor: colors.statusErrorText,
    borderWidth: semantic.borderWidth.focus,
  },
  money: {
    alignItems: "center",
    flexDirection: "row",
    gap: primitives.space["2"],
  },
  field: { gap: primitives.space["1"] },
  stack: { gap: primitives.space["3"] },
  errors: {
    backgroundColor: colors.statusErrorSurface,
    borderRadius: semantic.radius.control,
    gap: primitives.space["1"],
    padding: primitives.space["3"],
  },
  errorText: {
    color: colors.statusErrorText,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: colors.backgroundSurface,
    borderTopColor: colors.borderStrong,
    borderTopWidth: semantic.borderWidth.default,
    gap: primitives.space["2"],
    paddingHorizontal: primitives.space["5"],
    paddingVertical: primitives.space["3"],
  },
  sheetLayer: {
    // Voile des feuilles, comme le sélecteur de date.
    backgroundColor: primitives.shadow.md.color,
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: colors.backgroundSurface,
    borderTopLeftRadius: semantic.radius.card,
    borderTopRightRadius: semantic.radius.card,
    gap: primitives.space["3"],
    maxWidth: primitives.size.contentMd,
    padding: primitives.space["5"],
    width: "100%",
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: primitives.radius.pill,
    minWidth: primitives.space["5"],
    paddingHorizontal: primitives.space["1"],
    position: "absolute",
    right: primitives.space["1"],
    top: primitives.space["1"],
  },
  badgeText: {
    color: colors.actionPrimaryText,
    fontSize: primitives.fontSize.xs,
    fontWeight: semibold,
  },
  sheetScroll: { flexShrink: 1 },
  sheetList: { gap: primitives.space["3"] },
  // Comparaison par jour du détail du calcul (#393).
  perDay: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["3"],
  },
  perDayValue: {
    backgroundColor: colors.backgroundCanvas,
    borderRadius: semantic.radius.control,
    flexBasis: 140,
    flexGrow: 1,
    gap: primitives.space["1"],
    padding: primitives.space["3"],
  },
  perDayActual: { backgroundColor: colors.statusSuccessSurface },
  perDayAmount: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
  },
  iconButton: {
    alignItems: "center",
    height: semantic.size.controlMinHeight,
    justifyContent: "center",
    width: semantic.size.controlMinHeight,
  },
});

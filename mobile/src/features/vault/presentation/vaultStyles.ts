import { StyleSheet } from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

/** Seuil des deux colonnes, comme le Coffre Web (768 px). */
export const VAULT_TWO_COLUMNS = 768;

export const vaultColors = colors;

/** Styles partagés par les écrans du Coffre (#419), sur les tokens. */
export const vaultStyles = StyleSheet.create({
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
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: semibold,
  },
  lead: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: primitives.fontSize.md * primitives.lineHeight.body,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
    marginTop: primitives.space["2"],
  },
  card: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    gap: primitives.space["3"],
    padding: primitives.space["4"],
  },
  shellCard: {
    backgroundColor: colors.backgroundShell,
    borderColor: colors.backgroundShell,
  },
  onShell: { color: colors.textOnShell },
  onShellMuted: { color: colors.textOnShellMuted },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
  },
  row: {
    alignItems: "center",
    columnGap: primitives.space["3"],
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: primitives.space["1"],
  },
  amount: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  bigAmount: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
  },
  text: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    lineHeight: primitives.fontSize.md * primitives.lineHeight.body,
  },
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
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
  },
  grow: { flexGrow: 1 },
  notice: {
    backgroundColor: colors.statusInfoSurface,
    borderRadius: semantic.radius.control,
    padding: primitives.space["3"],
  },
  noticeText: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.sm,
    lineHeight: 20,
  },
  columns: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["3"],
  },
  column: { flexBasis: 0, flexGrow: 1, gap: primitives.space["3"] },
  half: { width: "48.5%" },
  full: { width: "100%" },
  movement: {
    alignItems: "center",
    borderTopColor: colors.borderSubtle,
    borderTopWidth: semantic.borderWidth.default,
    flexDirection: "row",
    gap: primitives.space["3"],
    paddingTop: primitives.space["2"],
  },
  firstMovement: { borderTopWidth: 0, paddingTop: 0 },
  movementCopy: { flex: 1, gap: 2 },
  track: {
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: primitives.radius.pill,
    height: 10,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: primitives.radius.pill,
    height: "100%",
  },
  link: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
  },
  linkLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.7 },
});

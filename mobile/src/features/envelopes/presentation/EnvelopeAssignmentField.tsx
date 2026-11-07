import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Pressable,
} from "react-native";

import { ChoiceList } from "@/src/design/ChoiceList";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { formatEnvelopeMoney } from "@/src/features/envelopes/domain/budgetEnvelope";
import {
  AssignmentState,
  isIncompatible,
  selectedOccurrence,
  suggestedOccurrences,
} from "@/src/features/envelopes/domain/envelopeAssignment";
import { monthLabel } from "@/src/features/envelopes/presentation/envelopeFormat";

/** Valeur interne de « Aucun rattachement » (identifiants backend > 0). */
const NONE = 0;
const semibold = `${primitives.fontWeight.semibold}` as "600";

interface Props {
  state: AssignmentState;
  categoryId: number | null;
  disabled: boolean;
  error: string | null;
  onChoose(id: number | null): void;
  onRetry(): void;
}

/**
 * « Rattacher à une enveloppe » (#389), textes du Web : choix explicite,
 * suggestions d'après la catégorie, mois clôturé en lecture seule.
 */
export const EnvelopeAssignmentField = ({
  state,
  categoryId,
  disabled,
  error,
  onChoose,
  onRetry,
}: Props) => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const styles = makeStyles(colors);
  const { link, options, selectedId, optionsStatus } = state;
  const closedLink = Boolean(link.occurrence?.closed);
  const selected = selectedOccurrence(state);
  const open = options.filter((item) => !item.closed);
  const kept =
    selectedId !== null && !open.some((item) => item.id === selectedId)
      ? [
          {
            value: selectedId,
            label: `${selected?.title ?? "Enveloppe actuelle"} · ${
              selected ? monthLabel(selected.month) : "à vérifier"
            }${selected?.closed ? " · Clôturé" : ""}`,
          },
        ]
      : [];
  const choices = [
    { value: NONE, label: "Aucun rattachement" },
    ...kept,
    ...open.map((item) => ({
      value: item.id,
      label: `${item.title} · ${formatEnvelopeMoney(
        item.metrics.actual,
        item.currency,
      )} / ${formatEnvelopeMoney(item.metrics.planned, item.currency)}`,
    })),
  ];
  const suggestions =
    !closedLink && selectedId === null
      ? suggestedOccurrences(options, categoryId)
      : [];

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Rattacher à une enveloppe</Text>
      <ChoiceList
        label="Rattacher à une enveloppe"
        choices={choices}
        value={selectedId ?? NONE}
        disabled={disabled || link.status !== "success" || closedLink}
        error={error ?? undefined}
        onChange={(value) => onChoose(value === NONE ? null : value)}
      />
      <Text style={styles.help}>
        Seulement les charges mensuelles marquées comme enveloppes. Le choix est
        explicite ; les entrées ne sont pas rapprochables.
      </Text>
      {optionsStatus === "loading" || link.status === "loading" ? (
        <Text style={styles.help}>Chargement des enveloppes…</Text>
      ) : null}
      {optionsStatus === "error" || link.status === "error" ? (
        <View style={styles.notice}>
          <Text style={styles.text}>
            Le suivi des enveloppes n’a pas pu être chargé.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onRetry}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Réessayer le rattachement</Text>
          </Pressable>
        </View>
      ) : null}
      {closedLink ? (
        <Text style={styles.text}>
          Ce mois est clôturé. L’opération liée est conservée en lecture seule.
        </Text>
      ) : null}
      {isIncompatible(state) ? (
        <Text style={[styles.text, styles.warning]}>
          La date, la devise ou le type ne correspond plus à l’enveloppe.
          Dissociez explicitement ou choisissez une autre enveloppe.
        </Text>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={styles.notice}>
          <Text style={styles.text}>
            {suggestions.length > 1
              ? "Plusieurs enveloppes correspondent : choisissez celle à utiliser."
              : "Suggestion d’après la catégorie :"}
          </Text>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              disabled={disabled || link.status !== "success"}
              onPress={() => onChoose(item.id)}
              style={styles.button}
            >
              <Text style={styles.buttonLabel}>Choisir {item.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (colors: (typeof themes)["light" | "dark"]["color"]) =>
  StyleSheet.create({
    field: { gap: primitives.space["2"] },
    label: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
      marginTop: primitives.space["5"],
    },
    help: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    text: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    warning: { color: colors.statusErrorText, fontWeight: semibold },
    notice: { gap: primitives.space["2"] },
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
  });

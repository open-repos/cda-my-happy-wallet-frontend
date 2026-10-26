import { CategoryChoices } from "@/src/features/categories/presentation/CategoryChoices";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { FeedbackBanner } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { longDate } from "@/src/features/budget/domain/budgetCalendar";
import {
  PendingOccurrence,
  RealizeBody,
  realizeDraft,
  toRealizeBody,
} from "@/src/features/budget/domain/pendingOccurrence";
import {
  OperationCategory,
  OperationDraft,
  OperationDraftErrors,
  validateOperationDraft,
} from "@/src/features/operations/domain/oneOffOperation";
import { OperationDatePicker } from "@/src/features/operations/presentation/OperationDatePicker";

interface RealizeOccurrenceModalProps {
  busy: boolean;
  categories: OperationCategory[];
  categoriesError: boolean;
  /** Erreur de la dernière tentative, affichée dans la modale. */
  errorMessage: string | null;
  occurrence: PendingOccurrence | null;
  today: string;
  onCancel(): void;
  onRetryCategories(): void;
  onSave(body: RealizeBody): void;
}

const semibold = `${primitives.fontWeight.semibold}` as "600";

/**
 * Convertit un événement prévu en opération. Le sens est verrouillé par
 * l'événement; la catégorie reste à choisir; la date par défaut est corrigée
 * en jour courant pour une occurrence d'un mois clôturé.
 */
export const RealizeOccurrenceModal = ({
  busy,
  categories,
  categoriesError,
  errorMessage,
  occurrence,
  today,
  onCancel,
  onRetryCategories,
  onSave,
}: RealizeOccurrenceModalProps) => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const styles = makeStyles(colors);
  const [draft, setDraft] = useState<OperationDraft>(() =>
    occurrence ? realizeDraft(occurrence, today) : emptyDraft(today),
  );
  // Le parent change la `key` à chaque occurrence : l'état repart du brouillon.
  const [errors, setErrors] = useState<OperationDraftErrors>({});
  const categoryIds = useMemo(
    () => new Set(categories.map(({ id }) => id)),
    [categories],
  );

  const update = <K extends keyof OperationDraft>(
    key: K,
    value: OperationDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const validation = validateOperationDraft(draft, categoryIds);
    setErrors(validation);
    if (Object.keys(validation).length === 0) onSave(toRealizeBody(draft));
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      visible={occurrence !== null}
    >
      {/* Une Modal Android a besoin de son propre fournisseur de marges. */}
      <SafeAreaProvider>
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>
                  Convertir en opération
                </Text>
                <Pressable
                  accessibilityLabel="Fermer le formulaire"
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={onCancel}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.textPrimary} name="close" size={28} />
                </Pressable>
              </View>

              {occurrence !== null ? (
                <Text style={styles.caption}>
                  Événement prévu le {longDate(occurrence.occurrenceDate)}
                  {occurrence.occurrenceDate.slice(0, 7) < today.slice(0, 7)
                    ? " · daté du jour car le mois d’origine est clôturé"
                    : ""}
                  .
                </Text>
              ) : null}

              <Text style={styles.label}>Titre</Text>
              <TextInput
                accessibilityLabel="Titre"
                editable={!busy}
                maxLength={50}
                onChangeText={(value) => update("title", value)}
                placeholder="Titre de l’opération"
                style={[styles.input, errors.title && styles.invalid]}
                value={draft.title}
              />
              {errors.title ? (
                <Text style={styles.error}>{errors.title}</Text>
              ) : null}

              <Text style={styles.label}>
                Montant ({occurrence?.currency ?? "EUR"})
              </Text>
              <TextInput
                accessibilityLabel={`Montant en ${occurrence?.currency ?? "EUR"}`}
                editable={!busy}
                keyboardType="decimal-pad"
                onChangeText={(value) => update("amount", value)}
                placeholder="0,00"
                style={[styles.input, errors.amount && styles.invalid]}
                value={draft.amount}
              />
              {errors.amount ? (
                <Text style={styles.error}>{errors.amount}</Text>
              ) : null}

              <Text style={styles.label}>Date</Text>
              <OperationDatePicker
                disabled={busy}
                invalid={errors.operationDate != null}
                onChange={(value) => update("operationDate", value)}
                value={draft.operationDate}
              />
              {errors.operationDate ? (
                <Text style={styles.error}>{errors.operationDate}</Text>
              ) : null}

              <Text style={styles.label}>Catégorie</Text>
              {categories.length === 0 ? (
                <View style={styles.categoryState}>
                  <Text style={styles.error}>
                    {categoriesError
                      ? "Les catégories n’ont pas pu être chargées."
                      : "Aucune catégorie : créez-en une depuis l’onglet Opérations."}
                  </Text>
                  {categoriesError ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busy}
                      onPress={onRetryCategories}
                      style={[styles.button, styles.secondaryButton]}
                    >
                      <Text style={styles.secondaryLabel}>Réessayer</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <CategoryChoices
                categories={categories}
                value={draft.categoryId}
                disabled={busy}
                error={errors.categoryId}
                onChange={(value) => update("categoryId", value)}
              />

              {errorMessage ? (
                <View style={styles.banner}>
                  <FeedbackBanner kind="error">{errorMessage}</FeedbackBanner>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={onCancel}
                  style={[styles.button, styles.secondaryButton]}
                >
                  <Text style={styles.secondaryLabel}>Annuler</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Enregistrer l’opération"
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled: busy }}
                  disabled={busy}
                  onPress={submit}
                  style={[
                    styles.button,
                    styles.primaryButton,
                    busy && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.actionPrimaryText} />
                  ) : (
                    <Text style={styles.primaryLabel}>Enregistrer</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const emptyDraft = (today: string): OperationDraft => ({
  title: "",
  amount: "",
  operationDate: today,
  categoryId: null,
  kind: "DEPENSE",
});

const makeStyles = (colors: (typeof themes)["light" | "dark"]["color"]) =>
  StyleSheet.create({
    flex: { backgroundColor: colors.backgroundCanvas, flex: 1 },
    content: {
      alignSelf: "center",
      padding: primitives.space["6"],
      paddingBottom: primitives.space["16"],
      width: "100%",
      maxWidth: primitives.size.contentSm,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: primitives.fontSize["2xl"],
      fontWeight: semibold,
    },
    caption: {
      color: colors.textMuted,
      fontSize: primitives.fontSize.sm,
      marginTop: primitives.space["2"],
    },
    iconButton: {
      alignItems: "center",
      height: primitives.size.controlMd,
      justifyContent: "center",
      width: primitives.size.controlMd,
    },
    label: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
      marginBottom: primitives.space["2"],
      marginTop: primitives.space["5"],
    },
    input: {
      backgroundColor: colors.fieldBackground,
      borderColor: colors.fieldBorder,
      borderRadius: semantic.radius.control,
      borderWidth: semantic.borderWidth.default,
      color: colors.fieldText,
      fontSize: primitives.fontSize.md,
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    invalid: {
      borderColor: colors.statusErrorText,
      borderWidth: semantic.borderWidth.focus,
    },
    error: {
      color: colors.statusErrorText,
      fontSize: primitives.fontSize.sm,
      marginTop: primitives.space["1"],
    },
    categoryList: {
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderSubtle,
      borderRadius: semantic.radius.control,
      borderWidth: semantic.borderWidth.default,
      overflow: "hidden",
    },
    category: {
      alignItems: "center",
      borderBottomColor: colors.borderSubtle,
      borderBottomWidth: semantic.borderWidth.default,
      flexDirection: "row",
      gap: primitives.space["3"],
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    categorySelected: { backgroundColor: colors.statusSuccessSurface },
    swatch: {
      borderRadius: primitives.radius.pill,
      height: primitives.space["4"],
      width: primitives.space["4"],
    },
    categoryLabel: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: primitives.fontSize.md,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      justifyContent: "flex-end",
      marginTop: primitives.space["8"],
    },
    button: {
      alignItems: "center",
      borderRadius: semantic.radius.control,
      justifyContent: "center",
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    primaryButton: { backgroundColor: colors.actionPrimaryBackground },
    secondaryButton: { backgroundColor: colors.actionSecondaryBackground },
    primaryLabel: {
      color: colors.actionPrimaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    secondaryLabel: {
      color: colors.actionSecondaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    banner: { marginTop: primitives.space["6"] },
    categoryState: {
      alignItems: "flex-start",
      gap: primitives.space["2"],
      marginBottom: primitives.space["2"],
    },
    disabled: { opacity: 0.65 },
  });

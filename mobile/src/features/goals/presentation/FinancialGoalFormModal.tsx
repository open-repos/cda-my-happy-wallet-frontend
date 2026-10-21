import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
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
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { FeedbackBanner } from "@/src/design/FeedbackState";
import { RadioGroup } from "@/src/design/RadioGroup";
import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  FinancialGoal,
  GoalDraft,
  GoalDraftErrors,
  validateGoalDraft,
} from "@/src/features/goals/domain/financialGoal";
import { formatCalendarDate } from "@/src/features/operations/presentation/calendarDate";
import { OperationDatePicker } from "@/src/features/operations/presentation/OperationDatePicker";

interface FinancialGoalFormModalProps {
  /** Échec d'enregistrement ou de suppression, affiché dans la fenêtre. */
  errorMessage: string | null;
  goal: FinancialGoal | null;
  isSaving: boolean;
  visible: boolean;
  onCancel(): void;
  onDelete(): void;
  onSave(draft: GoalDraft): void;
}

type AmountField = "targetAmount" | "savedAmount" | "monthlyContribution";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";
const AMOUNT_FIELDS: {
  key: AmountField;
  label: string;
  placeholder: string;
}[] = [
  { key: "targetAmount", label: "Montant cible", placeholder: "1 200,00" },
  { key: "savedAmount", label: "Déjà épargné", placeholder: "0,00" },
  {
    key: "monthlyContribution",
    label: "Versement mensuel prévu",
    placeholder: "0,00",
  },
];

const createDraft = (goal: FinancialGoal | null): GoalDraft => ({
  title: goal?.title ?? "",
  targetAmount: goal?.targetAmount ?? "",
  savedAmount: goal?.savedAmount ?? "0",
  monthlyContribution: goal?.monthlyContribution ?? "0",
  targetDate: goal?.targetDate ?? null,
});

export const FinancialGoalFormModal = ({
  errorMessage,
  goal,
  isSaving,
  visible,
  onCancel,
  onDelete,
  onSave,
}: FinancialGoalFormModalProps) => {
  const [draft, setDraft] = useState(() => createDraft(goal));
  const [errors, setErrors] = useState<GoalDraftErrors>({});
  // Confirmation dans le formulaire : `Alert.alert` est sans effet sur le Web.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const update = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const validationErrors = validateGoalDraft(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) onSave(draft);
  };

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={visible}>
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
                  {goal == null ? "Ajouter un objectif" : "Modifier l’objectif"}
                </Text>
                <Pressable
                  accessibilityLabel="Fermer le formulaire"
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={onCancel}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.textPrimary} name="close" size={28} />
                </Pressable>
              </View>
              {errorMessage && !isConfirmingDelete ? (
                <FeedbackBanner kind="error">{errorMessage}</FeedbackBanner>
              ) : null}

              <Text style={styles.label}>Titre</Text>
              <TextInput
                accessibilityLabel="Titre"
                editable={!isSaving}
                maxLength={50}
                onChangeText={(value) => update("title", value)}
                placeholder="Exemple : Vacances d’été"
                style={[styles.input, errors.title && styles.invalid]}
                value={draft.title}
              />
              {errors.title ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.title}
                </Text>
              ) : null}

              {AMOUNT_FIELDS.map(({ key, label, placeholder }) => (
                <View key={key}>
                  <Text style={styles.label}>{label} en euros</Text>
                  <TextInput
                    accessibilityLabel={`${label} en euros`}
                    editable={!isSaving}
                    keyboardType="decimal-pad"
                    onChangeText={(value) => update(key, value)}
                    placeholder={placeholder}
                    style={[styles.input, errors[key] && styles.invalid]}
                    value={draft[key]}
                  />
                  {errors[key] ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                      {errors[key]}
                    </Text>
                  ) : null}
                </View>
              ))}

              <Text style={styles.label}>Date souhaitée</Text>
              <RadioGroup
                choices={[
                  { value: "none", label: "Sans date" },
                  { value: "date", label: "Avant une date" },
                ]}
                disabled={isSaving}
                label="Date souhaitée"
                value={draft.targetDate == null ? "none" : "date"}
                onChange={(value) =>
                  update(
                    "targetDate",
                    value === "none" ? null : formatCalendarDate(new Date()),
                  )
                }
              />
              {draft.targetDate != null ? (
                <View style={styles.datePicker}>
                  <OperationDatePicker
                    disabled={isSaving}
                    invalid={errors.targetDate != null}
                    label="Date souhaitée"
                    onChange={(value) => update("targetDate", value)}
                    value={draft.targetDate}
                  />
                </View>
              ) : null}
              {errors.targetDate ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.targetDate}
                </Text>
              ) : null}

              {goal != null && isConfirmingDelete ? (
                <View accessibilityRole="alert" style={styles.confirmation}>
                  <Text style={styles.confirmationText}>
                    Supprimer l’objectif « {goal.title} » ?
                  </Text>
                  {errorMessage ? (
                    <FeedbackBanner kind="error">{errorMessage}</FeedbackBanner>
                  ) : null}
                  <View style={styles.confirmationActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={() => setIsConfirmingDelete(false)}
                      style={[styles.button, styles.secondaryButton]}
                    >
                      <Text style={styles.secondaryLabel}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={onDelete}
                      style={[styles.button, styles.deleteButton]}
                    >
                      <Text style={styles.deleteLabel}>Oui, supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.actions}>
                {goal != null && !isConfirmingDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => setIsConfirmingDelete(true)}
                    style={[
                      styles.button,
                      styles.deleteButton,
                      styles.pushLeft,
                    ]}
                  >
                    <Text style={styles.deleteLabel}>Supprimer</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={onCancel}
                  style={[styles.button, styles.secondaryButton]}
                >
                  <Text style={styles.secondaryLabel}>Annuler</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: isSaving, disabled: isSaving }}
                  disabled={isSaving}
                  onPress={submit}
                  style={[
                    styles.button,
                    styles.primaryButton,
                    isSaving && styles.disabled,
                  ]}
                >
                  {isSaving ? (
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

const styles = StyleSheet.create({
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
  datePicker: { marginTop: primitives.space["3"] },
  confirmation: {
    backgroundColor: colors.statusErrorSurface,
    borderRadius: semantic.radius.control,
    gap: primitives.space["3"],
    marginTop: primitives.space["6"],
    padding: primitives.space["4"],
  },
  confirmationText: {
    color: colors.statusErrorText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  confirmationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    justifyContent: "flex-end",
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
  deleteButton: { backgroundColor: colors.actionDangerBackground },
  pushLeft: { marginRight: "auto" },
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
  deleteLabel: {
    color: colors.actionDangerText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  disabled: { opacity: 0.65 },
});

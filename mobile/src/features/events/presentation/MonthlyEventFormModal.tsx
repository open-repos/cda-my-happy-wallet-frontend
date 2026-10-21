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
import { RadioChoice, RadioGroup } from "@/src/design/RadioGroup";
import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  EventDraft,
  EventDraftErrors,
  EventKind,
  MonthlyEvent,
  formRecurrenceOptions,
  recurrenceLabel,
  validateEventDraft,
} from "@/src/features/events/domain/monthlyEvent";
import { formatCalendarDate } from "@/src/features/operations/presentation/calendarDate";
import { OperationDatePicker } from "@/src/features/operations/presentation/OperationDatePicker";

interface MonthlyEventFormModalProps {
  /** Échec d'enregistrement ou de suppression, affiché dans la fenêtre. */
  errorMessage: string | null;
  event: MonthlyEvent | null;
  isSaving: boolean;
  visible: boolean;
  onCancel(): void;
  onDelete(): void;
  onSave(draft: EventDraft): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";
const KINDS: RadioChoice<EventKind>[] = [
  { value: "DEPENSE", label: "Dépense" },
  { value: "ENTREE", label: "Entrée" },
];

const createDraft = (event: MonthlyEvent | null): EventDraft => ({
  title: event?.title ?? "",
  amount: event?.amount ?? "",
  kind: event?.kind ?? "DEPENSE",
  startDate: event?.startDate ?? formatCalendarDate(new Date()),
  recurrence: event?.recurrence ?? "MENSUELLE",
  endDate: event?.endDate ?? null,
});

export const MonthlyEventFormModal = ({
  errorMessage,
  event,
  isSaving,
  visible,
  onCancel,
  onDelete,
  onSave,
}: MonthlyEventFormModalProps) => {
  const [draft, setDraft] = useState(() => createDraft(event));
  const [errors, setErrors] = useState<EventDraftErrors>({});
  // Confirmation dans le formulaire : `Alert.alert` est sans effet sur le Web.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const repeats = draft.recurrence !== "AUCUNE";

  const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const validationErrors = validateEventDraft(draft);
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
                  {event == null
                    ? "Ajouter un événement"
                    : "Modifier l’événement"}
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
              {/* Dans la fenêtre : un bandeau de la liste, derrière la Modal,
                  ne serait ni vu ni lu (#225). */}
              {errorMessage && !isConfirmingDelete ? (
                <FeedbackBanner kind="error">{errorMessage}</FeedbackBanner>
              ) : null}

              <Text style={styles.label}>Titre</Text>
              <TextInput
                accessibilityLabel="Titre"
                editable={!isSaving}
                maxLength={50}
                onChangeText={(value) => update("title", value)}
                placeholder="Exemple : Assurance habitation"
                style={[styles.input, errors.title && styles.invalid]}
                value={draft.title}
              />
              {errors.title ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.title}
                </Text>
              ) : null}

              <Text style={styles.label}>Montant en euros</Text>
              <TextInput
                accessibilityLabel="Montant en euros"
                editable={!isSaving}
                keyboardType="decimal-pad"
                onChangeText={(value) => update("amount", value)}
                placeholder="0,00"
                style={[styles.input, errors.amount && styles.invalid]}
                value={draft.amount}
              />
              {errors.amount ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.amount}
                </Text>
              ) : null}

              <Text style={styles.label}>Sens</Text>
              <RadioGroup
                choices={KINDS}
                disabled={isSaving}
                label="Sens"
                value={draft.kind}
                onChange={(value) => update("kind", value)}
              />

              <Text style={styles.label}>Date de début</Text>
              <OperationDatePicker
                disabled={isSaving}
                invalid={errors.startDate != null}
                label="Date de début"
                onChange={(value) => update("startDate", value)}
                value={draft.startDate}
              />
              {errors.startDate ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.startDate}
                </Text>
              ) : null}

              <Text style={styles.label}>Répétition</Text>
              <RadioGroup
                choices={formRecurrenceOptions(
                  event?.recurrence ?? draft.recurrence,
                ).map((value) => ({ value, label: recurrenceLabel(value) }))}
                disabled={isSaving}
                label="Répétition"
                value={draft.recurrence}
                onChange={(value) => update("recurrence", value)}
              />

              {repeats ? (
                <>
                  <Text style={styles.label}>Fin de la répétition</Text>
                  <RadioGroup
                    choices={[
                      { value: "none", label: "Sans date de fin" },
                      { value: "date", label: "Jusqu’à une date" },
                    ]}
                    disabled={isSaving}
                    label="Fin de la répétition"
                    value={draft.endDate == null ? "none" : "date"}
                    onChange={(value) =>
                      update(
                        "endDate",
                        value === "none" ? null : draft.startDate,
                      )
                    }
                  />
                  {draft.endDate != null ? (
                    <View style={styles.endDate}>
                      <OperationDatePicker
                        disabled={isSaving}
                        invalid={errors.endDate != null}
                        label="Date de fin incluse"
                        onChange={(value) => update("endDate", value)}
                        value={draft.endDate}
                      />
                    </View>
                  ) : null}
                  {errors.endDate ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                      {errors.endDate}
                    </Text>
                  ) : null}
                </>
              ) : null}

              {event != null && isConfirmingDelete ? (
                <View accessibilityRole="alert" style={styles.confirmation}>
                  <Text style={styles.confirmationText}>
                    Supprimer « {event.title} » ? Ses prochaines occurrences
                    disparaîtront du calendrier.
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
                {event != null && !isConfirmingDelete ? (
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
  endDate: { marginTop: primitives.space["3"] },
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

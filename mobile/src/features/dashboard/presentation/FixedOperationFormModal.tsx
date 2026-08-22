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
} from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  FixedOperation,
  FixedOperationDraft,
  FixedOperationDraftErrors,
  FixedOperationType,
  validateFixedOperationDraft,
} from "@/src/features/dashboard/domain/fixedBudget";

interface FixedOperationFormModalProps {
  initialType: FixedOperationType;
  isSaving: boolean;
  operation: FixedOperation | null;
  visible: boolean;
  onCancel(): void;
  onDelete(): void;
  onSave(draft: FixedOperationDraft): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const createDraft = (
  operation: FixedOperation | null,
  initialType: FixedOperationType,
): FixedOperationDraft => ({
  title: operation?.title ?? "",
  amount: operation?.amount ?? "",
  type: operation?.type ?? initialType,
});

export const FixedOperationFormModal = ({
  initialType,
  isSaving,
  operation,
  visible,
  onCancel,
  onDelete,
  onSave,
}: FixedOperationFormModalProps) => {
  const initialDraft = useMemo(
    () => createDraft(operation, initialType),
    [initialType, operation],
  );
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<FixedOperationDraftErrors>({});
  const update = <K extends keyof FixedOperationDraft>(
    key: K,
    value: FixedOperationDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = () => {
    const validationErrors = validateFixedOperationDraft(draft);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) onSave(draft);
  };

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible={visible}>
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
              {operation == null
                ? "Ajouter au budget fixe"
                : "Modifier le budget fixe"}
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

          <Text style={styles.label}>Type</Text>
          <View accessibilityRole="radiogroup" style={styles.segmented}>
            {(["REVENU", "CHARGE"] as const).map((type) => {
              const selected = draft.type === type;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selected,
                    disabled: operation != null,
                  }}
                  disabled={isSaving || operation != null}
                  onPress={() => update("type", type)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      selected && styles.segmentLabelSelected,
                    ]}
                  >
                    {type === "REVENU" ? "Revenu" : "Charge"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {operation != null ? (
            <Text style={styles.help}>
              Le type ne peut pas être changé après création.
            </Text>
          ) : null}

          <Text style={styles.label}>Libellé</Text>
          <TextInput
            accessibilityLabel="Libellé"
            editable={!isSaving}
            maxLength={50}
            onChangeText={(value) => update("title", value)}
            placeholder="Exemple : Loyer"
            style={[styles.input, errors.title && styles.invalid]}
            value={draft.title}
          />
          {errors.title ? (
            <Text style={styles.error}>{errors.title}</Text>
          ) : null}

          <Text style={styles.label}>Montant mensuel en euros</Text>
          <TextInput
            accessibilityLabel="Montant mensuel en euros"
            editable={!isSaving}
            keyboardType="decimal-pad"
            onChangeText={(value) => update("amount", value)}
            placeholder="0,00"
            style={[styles.input, errors.amount && styles.invalid]}
            value={draft.amount}
          />
          {errors.amount ? (
            <Text style={styles.error}>{errors.amount}</Text>
          ) : null}

          <View style={styles.actions}>
            {operation != null ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onDelete}
                style={[styles.button, styles.deleteButton]}
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: primitives.size.contentSm,
    padding: primitives.space["6"],
    paddingBottom: primitives.space["16"],
    width: "100%",
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
  segmented: { flexDirection: "row", gap: primitives.space["2"] },
  segment: {
    alignItems: "center",
    borderColor: colors.fieldBorder,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    flex: 1,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
  },
  segmentSelected: {
    backgroundColor: colors.actionSecondaryBackground,
    borderColor: colors.borderStrong,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
  },
  segmentLabelSelected: {
    color: colors.actionSecondaryText,
    fontWeight: semibold,
  },
  help: {
    color: colors.textMuted,
    fontSize: primitives.fontSize.xs,
    marginTop: primitives.space["2"],
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
  deleteButton: {
    backgroundColor: colors.actionDangerBackground,
    marginRight: "auto",
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

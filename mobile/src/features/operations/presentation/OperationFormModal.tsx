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
  OneOffOperation,
  OperationCategory,
  OperationDraft,
  OperationDraftErrors,
  validateOperationDraft,
} from "@/src/features/operations/domain/oneOffOperation";
import { formatCalendarDate } from "@/src/features/operations/presentation/calendarDate";
import { OperationDatePicker } from "@/src/features/operations/presentation/OperationDatePicker";

interface OperationFormModalProps {
  categories: OperationCategory[];
  isSaving: boolean;
  operation: OneOffOperation | null;
  visible: boolean;
  onCancel(): void;
  onDelete(): void;
  onSave(draft: OperationDraft): void;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const createDraft = (operation: OneOffOperation | null): OperationDraft => ({
  title: operation?.title ?? "",
  amount: operation?.amount ?? "",
  operationDate: operation?.operationDate ?? formatCalendarDate(new Date()),
  categoryId: operation?.categoryId ?? null,
  kind: operation?.type ?? "DEPENSE",
});

export const OperationFormModal = ({
  categories,
  isSaving,
  operation,
  visible,
  onCancel,
  onDelete,
  onSave,
}: OperationFormModalProps) => {
  const [draft, setDraft] = useState(() => createDraft(operation));
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
    const validationErrors = validateOperationDraft(draft, categoryIds);
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
                ? "Ajouter une opération"
                : "Modifier l’opération"}
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

          <Text style={styles.label}>Titre</Text>
          <TextInput
            accessibilityLabel="Titre"
            editable={!isSaving}
            maxLength={50}
            onChangeText={(value) => update("title", value)}
            placeholder="Exemple : Courses"
            style={[styles.input, errors.title && styles.invalid]}
            value={draft.title}
          />
          {errors.title ? (
            <Text style={styles.error}>{errors.title}</Text>
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
            <Text style={styles.error}>{errors.amount}</Text>
          ) : null}

          <Text style={styles.label}>Date</Text>
          <OperationDatePicker
            disabled={isSaving}
            invalid={errors.operationDate != null}
            onChange={(value) => update("operationDate", value)}
            value={draft.operationDate}
          />
          {errors.operationDate ? (
            <Text style={styles.error}>{errors.operationDate}</Text>
          ) : null}

          <Text style={styles.label}>Type d’opération</Text>
          <View accessibilityRole="radiogroup" style={styles.segmented}>
            {(["DEPENSE", "ENTREE"] as const).map((kind) => {
              const selected = draft.kind === kind;
              return (
                <Pressable
                  key={kind}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  disabled={isSaving}
                  onPress={() => update("kind", kind)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      selected && styles.segmentLabelSelected,
                    ]}
                  >
                    {kind === "DEPENSE" ? "Dépense" : "Entrée"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Catégorie</Text>
          <View
            style={[styles.categoryList, errors.categoryId && styles.invalid]}
          >
            {categories.map((category) => {
              const selected = draft.categoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  disabled={isSaving}
                  onPress={() => update("categoryId", category.id)}
                  style={[styles.category, selected && styles.categorySelected]}
                >
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: category.color ?? colors.borderSubtle,
                      },
                    ]}
                  />
                  <Text style={styles.categoryLabel}>{category.name}</Text>
                  {selected ? (
                    <Ionicons
                      color={colors.statusSuccessText}
                      name="checkmark-circle"
                      size={20}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          {errors.categoryId ? (
            <Text style={styles.error}>{errors.categoryId}</Text>
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
    fontWeight: semibold,
  },
  segmentLabelSelected: { color: colors.actionSecondaryText },
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

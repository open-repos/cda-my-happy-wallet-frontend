import { ActionButton } from "@/src/design/ActionButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
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

import { primitives, semantic, themes } from "@/src/design/tokens";
import { CategoryChoices } from "@/src/features/categories/presentation/CategoryChoices";
import {
  compatibleFixedCategories,
  effectiveMonthOptions,
  envelopeAvailable,
  fixedCategoryOptions,
  FixedOperation,
  FixedOperationDraft,
  FixedOperationDraftErrors,
  FixedOperationType,
  validateFixedOperationDraft,
} from "@/src/features/dashboard/domain/fixedBudget";
import { FixedCategoriesStatus } from "@/src/features/dashboard/presentation/useFixedCategories";
import { currentParisMonth } from "@/src/features/budget/domain/budgetSummary";
import { monthLabel } from "@/src/features/envelopes/presentation/envelopeFormat";
import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";

interface FixedOperationFormModalProps {
  categories: OperationCategory[];
  categoriesStatus: FixedCategoriesStatus;
  /** Refus serveur de la catégorie choisie (`INVALID_FIXED_CATEGORY`). */
  categoryError: string | null;
  initialType: FixedOperationType;
  isSaving: boolean;
  operation: FixedOperation | null;
  visible: boolean;
  onCancel(): void;
  onCategoryChange(): void;
  onDelete(): void;
  onRetryCategories(): void;
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
  categoryId: operation?.categoryId ?? null,
  isBudgetEnvelope: operation?.isBudgetEnvelope ?? false,
  effectiveMonth: null,
});

/** « novembre 2026 — ce mois », comme les options du Web. */
const effectiveLabel = (months: string[], index: number) =>
  `${monthLabel(months[index])}${
    index === 0 ? " — ce mois" : index === 1 ? " — prochain mois" : ""
  }`;

export const FixedOperationFormModal = ({
  categories,
  categoriesStatus,
  categoryError,
  initialType,
  isSaving,
  operation,
  visible,
  onCancel,
  onCategoryChange,
  onDelete,
  onRetryCategories,
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
  const categoryOptions = useMemo(
    () => fixedCategoryOptions(categories, draft.type, operation),
    [categories, draft.type, operation],
  );
  const changeType = (type: FixedOperationType) => {
    // Une catégorie réservée à l'autre type n'est pas conservée.
    const keepsCategory = compatibleFixedCategories(categories, type).some(
      ({ id }) => id === draft.categoryId,
    );
    setDraft((current) => ({
      ...current,
      type,
      categoryId: keepsCategory ? current.categoryId : null,
      // Une entrée n'est jamais une enveloppe (Web #314).
      isBudgetEnvelope: type === "CHARGE" ? current.isBudgetEnvelope : false,
    }));
    setErrors((current) => ({ ...current, categoryId: undefined }));
  };
  const changeCategory = (categoryId: number | null) => {
    update("categoryId", categoryId);
    onCategoryChange();
  };
  const submit = () => {
    const validationErrors = validateFixedOperationDraft(draft, {
      available:
        categoriesStatus === "success"
          ? compatibleFixedCategories(categories, draft.type)
          : null,
      current: operation,
    });
    setErrors(validationErrors);
    const firstError =
      validationErrors.title ??
      validationErrors.amount ??
      validationErrors.categoryId;
    if (firstError != null) {
      // Les zones live ne sont lues que sur Android : annonce explicite.
      AccessibilityInfo.announceForAccessibility(firstError);
      return;
    }
    onSave(draft);
  };
  useEffect(() => {
    if (categoryError != null) {
      AccessibilityInfo.announceForAccessibility(categoryError);
    }
  }, [categoryError]);
  const shownCategoryError = errors.categoryId ?? categoryError ?? undefined;
  const canBeEnvelope = envelopeAvailable(draft.type, operation?.period);
  // Mois d'effet : courant (index 0) et 23 suivants, comme le Web.
  const months = useMemo(() => effectiveMonthOptions(currentParisMonth()), []);
  const monthIndex = Math.max(
    0,
    draft.effectiveMonth == null ? 0 : months.indexOf(draft.effectiveMonth),
  );
  const moveMonth = (offset: number) => {
    const next = Math.min(months.length - 1, Math.max(0, monthIndex + offset));
    update("effectiveMonth", next === 0 ? null : months[next]);
    AccessibilityInfo.announceForAccessibility(effectiveLabel(months, next));
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
                      // `aria-checked` : exposé sur Android, iOS et le Web (#148).
                      // L'état désactivé vient de la prop `disabled`.
                      aria-checked={selected}
                      disabled={isSaving || operation != null}
                      onPress={() => changeType(type)}
                      style={[
                        styles.segment,
                        selected && styles.segmentSelected,
                      ]}
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

              <Text style={styles.label}>Catégorie (facultative)</Text>
              {categoriesStatus === "loading" ? (
                <View style={styles.notice}>
                  <ActivityIndicator color={colors.textSecondary} />
                  <Text style={styles.noticeText}>
                    Chargement des catégories…
                  </Text>
                </View>
              ) : null}
              {categoriesStatus === "error" ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    Catégories indisponibles. Votre choix est conservé.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={onRetryCategories}
                    style={[styles.button, styles.secondaryButton]}
                  >
                    <Text style={styles.secondaryLabel}>
                      Réessayer les catégories
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {draft.categoryId != null &&
              !categoryOptions.some(({ id }) => id === draft.categoryId) ? (
                <Text style={styles.noticeText}>
                  Catégorie indisponible : l’affectation actuelle est conservée
                  tant que vous n’en choisissez pas une autre.
                </Text>
              ) : null}
              <CategoryChoices
                categories={categoryOptions}
                value={draft.categoryId}
                disabled={isSaving || categoriesStatus !== "success"}
                error={shownCategoryError}
                noneLabel="Non catégorisé"
                onChange={changeCategory}
              />

              {draft.type === "CHARGE" ? (
                <View style={styles.envelope}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Utiliser comme enveloppe budgétaire mensuelle"
                    aria-checked={Boolean(draft.isBudgetEnvelope)}
                    disabled={isSaving || !canBeEnvelope}
                    onPress={() =>
                      update("isBudgetEnvelope", !draft.isBudgetEnvelope)
                    }
                    style={[styles.check, !canBeEnvelope && styles.disabled]}
                  >
                    <Ionicons
                      color={colors.actionPrimaryBackground}
                      name={
                        draft.isBudgetEnvelope ? "checkbox" : "square-outline"
                      }
                      size={24}
                    />
                    <Text style={styles.checkLabel}>
                      Utiliser comme enveloppe budgétaire mensuelle
                    </Text>
                  </Pressable>
                  <Text style={styles.help}>
                    Rattachez vos dépenses réelles à cette charge pour suivre le
                    disponible et les dépassements. Aucune seconde charge n’est
                    créée.
                  </Text>
                  {!canBeEnvelope ? (
                    <Text style={styles.help}>
                      Le rapprochement est disponible uniquement pour les
                      charges mensuelles, sans date d’échéance supposée pour les
                      autres périodicités.
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {operation != null ? (
                <>
                  <Text style={styles.label}>
                    Appliquer la modification à partir de
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable
                      accessibilityLabel="Mois précédent"
                      accessibilityRole="button"
                      disabled={isSaving || monthIndex === 0}
                      onPress={() => moveMonth(-1)}
                      style={[
                        styles.stepButton,
                        monthIndex === 0 && styles.disabled,
                      ]}
                    >
                      <Ionicons
                        color={colors.textPrimary}
                        name="chevron-back"
                        size={22}
                      />
                    </Pressable>
                    <Text
                      accessibilityLabel={`Appliquer à partir de ${effectiveLabel(months, monthIndex)}`}
                      style={styles.stepValue}
                    >
                      {effectiveLabel(months, monthIndex)}
                    </Text>
                    <Pressable
                      accessibilityLabel="Mois suivant"
                      accessibilityRole="button"
                      disabled={isSaving || monthIndex === months.length - 1}
                      onPress={() => moveMonth(1)}
                      style={[
                        styles.stepButton,
                        monthIndex === months.length - 1 && styles.disabled,
                      ]}
                    >
                      <Ionicons
                        color={colors.textPrimary}
                        name="chevron-forward"
                        size={22}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.help}>
                    Les mois précédant le mois choisi et les bilans clôturés
                    sont conservés. Choisissez le prochain mois pour préparer
                    votre nouveau budget.
                  </Text>
                </>
              ) : null}

              <View style={styles.actions}>
                {operation != null ? (
                  <ActionButton
                    action="delete"
                    label="Supprimer"
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={onDelete}
                    style={[styles.button, styles.deleteButton]}
                  ></ActionButton>
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
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  envelope: { gap: primitives.space["2"], marginTop: primitives.space["5"] },
  check: {
    alignItems: "center",
    flexDirection: "row",
    gap: primitives.space["2"],
    minHeight: semantic.size.controlMinHeight,
  },
  checkLabel: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  stepper: {
    alignItems: "center",
    flexDirection: "row",
    gap: primitives.space["2"],
  },
  stepButton: {
    alignItems: "center",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: semantic.radius.control,
    height: semantic.size.controlMinHeight,
    justifyContent: "center",
    width: semantic.size.controlMinHeight,
  },
  stepValue: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: primitives.fontSize.md,
    textAlign: "center",
  },
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
  notice: {
    alignItems: "flex-start",
    gap: primitives.space["2"],
    marginBottom: primitives.space["2"],
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
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

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
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

import { FeedbackBanner } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import {
  CATEGORY_PALETTE,
  CategoryDraft,
  CategoryDraftErrors,
  validateCategoryDraft,
} from "@/src/features/categories/domain/categoryDraft";
import { CategoryResult } from "@/src/features/categories/presentation/useCategories";
import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

const NO_COLOR = "none";
const CUSTOM_COLOR = "custom";

type ColorChoice = { choice: string; custom: string };

const initialChoice = (value: string | null | undefined): ColorChoice => {
  if (!value) return { choice: NO_COLOR, custom: "" };
  const swatch = CATEGORY_PALETTE.find(
    (item) => item.value.toUpperCase() === value.toUpperCase(),
  );
  return swatch
    ? { choice: swatch.value, custom: "" }
    : { choice: CUSTOM_COLOR, custom: value };
};

const selectedColor = ({ choice, custom }: ColorChoice): string | null => {
  if (choice === NO_COLOR) return null;
  return choice === CUSTOM_COLOR ? custom.trim() : choice;
};

interface CategoryFormModalProps {
  category: OperationCategory | null;
  errorMessage: string | null;
  isSaving: boolean;
  onCancel(): void;
  onClearError(): void;
  onDelete(): Promise<CategoryResult | null>;
  onSave(draft: CategoryDraft): Promise<CategoryResult | null>;
}

interface ColorOptionProps {
  checked: boolean;
  disabled: boolean;
  label: string;
  swatch: string | null;
  onPress(): void;
}

const ColorOption = ({
  checked,
  disabled,
  label,
  swatch,
  onPress,
}: ColorOptionProps) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="radio"
    // `aria-*` : exposés sur Android, iOS et le Web (react-native-web).
    aria-checked={checked}
    aria-disabled={disabled}
    disabled={disabled}
    onPress={onPress}
    style={[styles.colorOption, checked && styles.colorOptionChecked]}
  >
    <View
      style={[
        styles.swatch,
        swatch ? { backgroundColor: swatch } : styles.swatchNone,
      ]}
    />
    <Text style={[styles.colorLabel, checked && styles.colorLabelChecked]}>
      {label}
    </Text>
  </Pressable>
);

/**
 * Création ou modification d'une catégorie : nom, couleur de la palette, code
 * hexadécimal ou aucune, suppression après confirmation intégrée (une alerte
 * système n'existe pas sur le Web).
 */
export const CategoryFormModal = ({
  category,
  errorMessage,
  isSaving,
  onCancel,
  onClearError,
  onDelete,
  onSave,
}: CategoryFormModalProps) => {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(() => initialChoice(category?.color));
  const [errors, setErrors] = useState<CategoryDraftErrors>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const choose = (choice: string) => {
    setColor((current) => ({ ...current, choice }));
    setErrors((current) => ({ ...current, color: undefined }));
  };

  const submit = async () => {
    const draft = { name, color: selectedColor(color) };
    const validationErrors = validateCategoryDraft(draft);
    setErrors(validationErrors);
    const firstError = validationErrors.name ?? validationErrors.color;
    if (firstError) {
      // Les zones live ne sont lues que sur Android : annonce explicite.
      AccessibilityInfo.announceForAccessibility(firstError);
      return;
    }
    const result = await onSave(draft);
    if (result?.code === "CATEGORY_NAME_CONFLICT") {
      setErrors({ name: "Une catégorie porte déjà ce nom." });
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onCancel} visible>
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
                  {category == null
                    ? "Ajouter une catégorie"
                    : "Modifier la catégorie"}
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

              {/* Erreur de l'API en tête, sauf si elle est déjà affichée près
                  du champ (conflit de nom) ou de la confirmation. */}
              {errorMessage && !errors.name && !isConfirmingDelete ? (
                <FeedbackBanner kind="error">{errorMessage}</FeedbackBanner>
              ) : null}

              <Text style={styles.label}>Nom</Text>
              <TextInput
                accessibilityHint={errors.name}
                accessibilityLabel="Nom"
                editable={!isSaving}
                maxLength={50}
                onChangeText={(value) => {
                  setName(value);
                  onClearError();
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="Exemple : Loisirs"
                style={[styles.input, errors.name && styles.invalid]}
                value={name}
              />
              {errors.name ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.name}
                </Text>
              ) : null}

              <Text style={styles.label}>Couleur</Text>
              <View
                accessibilityLabel="Couleur"
                accessibilityRole="radiogroup"
                style={styles.colors}
              >
                <ColorOption
                  checked={color.choice === NO_COLOR}
                  disabled={isSaving}
                  label="Sans couleur"
                  swatch={null}
                  onPress={() => choose(NO_COLOR)}
                />
                {CATEGORY_PALETTE.map((swatch) => (
                  <ColorOption
                    key={swatch.value}
                    checked={color.choice === swatch.value}
                    disabled={isSaving}
                    label={swatch.label}
                    swatch={swatch.value}
                    onPress={() => choose(swatch.value)}
                  />
                ))}
                <ColorOption
                  checked={color.choice === CUSTOM_COLOR}
                  disabled={isSaving}
                  label="Autre couleur"
                  swatch={
                    /^#[0-9A-F]{6}$/i.test(color.custom) ? color.custom : null
                  }
                  onPress={() => choose(CUSTOM_COLOR)}
                />
              </View>
              {color.choice === CUSTOM_COLOR ? (
                <>
                  <Text style={styles.label}>Code couleur (#RRGGBB)</Text>
                  <TextInput
                    accessibilityHint={errors.color}
                    accessibilityLabel="Code couleur (#RRGGBB)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isSaving}
                    maxLength={7}
                    onChangeText={(value) => {
                      setColor((current) => ({ ...current, custom: value }));
                      setErrors((current) => ({
                        ...current,
                        color: undefined,
                      }));
                    }}
                    placeholder="#275DAD"
                    style={[styles.input, errors.color && styles.invalid]}
                    value={color.custom}
                  />
                </>
              ) : null}
              {errors.color ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {errors.color}
                </Text>
              ) : null}

              {category != null && isConfirmingDelete ? (
                <View accessibilityRole="alert" style={styles.confirmation}>
                  <Text style={styles.confirmationText}>
                    Supprimer « {category.name} » ?
                  </Text>
                  {errorMessage ? (
                    <Text
                      accessibilityLiveRegion="assertive"
                      style={styles.confirmationError}
                    >
                      {errorMessage}
                    </Text>
                  ) : null}
                  <View style={styles.confirmationActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={() => {
                        onClearError();
                        setIsConfirmingDelete(false);
                      }}
                      style={[styles.button, styles.secondaryButton]}
                    >
                      <Text style={styles.secondaryLabel}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={() => void onDelete()}
                      style={[styles.button, styles.deleteButton]}
                    >
                      <Text style={styles.deleteLabel}>Oui, supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.actions}>
                {category != null && !isConfirmingDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => {
                      onClearError();
                      setIsConfirmingDelete(true);
                    }}
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
                  disabled={isSaving}
                  onPress={() => void submit()}
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
    gap: primitives.space["2"],
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
    marginTop: primitives.space["4"],
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
  },
  colors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
  },
  colorOption: {
    alignItems: "center",
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.control,
    borderWidth: semantic.borderWidth.default,
    flexDirection: "row",
    gap: primitives.space["2"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: primitives.space["3"],
  },
  colorOptionChecked: {
    backgroundColor: colors.statusInfoSurface,
    borderColor: colors.statusInfoText,
  },
  colorLabel: { color: colors.textPrimary, fontSize: primitives.fontSize.md },
  colorLabelChecked: { color: colors.statusInfoText, fontWeight: semibold },
  swatch: {
    borderColor: colors.borderStrong,
    borderRadius: primitives.radius.pill,
    borderWidth: semantic.borderWidth.default,
    height: primitives.space["5"],
    width: primitives.space["5"],
  },
  swatchNone: { backgroundColor: colors.backgroundSurface },
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
  confirmationError: {
    color: colors.statusErrorText,
    fontSize: primitives.fontSize.md,
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
  pushLeft: { marginRight: "auto" },
  primaryButton: { backgroundColor: colors.actionPrimaryBackground },
  secondaryButton: { backgroundColor: colors.actionSecondaryBackground },
  deleteButton: { backgroundColor: colors.actionDangerBackground },
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

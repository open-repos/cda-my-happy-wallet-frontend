import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
// Encoches et barre d'état sur Android comme sur iOS (le `SafeAreaView` de
// React Native ne gère que iOS).
import { SafeAreaView } from "react-native-safe-area-context";

import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { CategoryDraft } from "@/src/features/categories/domain/categoryDraft";
import { HttpCategoriesGateway } from "@/src/features/categories/infrastructure/HttpCategoriesGateway";
import { CategoryFormModal } from "@/src/features/categories/presentation/CategoryFormModal";
import {
  CategoryResult,
  useCategories,
} from "@/src/features/categories/presentation/useCategories";
import { OperationCategory } from "@/src/features/operations/domain/oneOffOperation";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

/** Liste et gestion des catégories d'opérations (#134). */
export const CategoriesScreen = () => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpCategoriesGateway(httpClient),
    [httpClient],
  );
  const state = useCategories(gateway);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [edited, setEdited] = useState<OperationCategory | null>(null);

  const open = (category: OperationCategory | null) => {
    setEdited(category);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEdited(null);
    }
  };
  const closeOnSuccess = (result: CategoryResult | null) => {
    if (result?.ok || result?.code === "CATEGORY_NOT_FOUND") {
      setIsFormOpen(false);
      setEdited(null);
    }
    return result;
  };
  const save = async (draft: CategoryDraft) =>
    closeOnSuccess(await state.save(edited?.id ?? null, draft));
  const remove = async () =>
    edited == null ? null : closeOnSuccess(await state.remove(edited.id));

  const backToOperations = (
    <Pressable
      accessibilityLabel="Retour aux opérations"
      accessibilityRole="link"
      onPress={() => router.navigate("/(app)/operations")}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
    >
      <Ionicons color={colors.textSecondary} name="chevron-back" size={20} />
      <Text style={styles.backLabel}>Opérations</Text>
    </Pressable>
  );

  if (state.status === "loading" || state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          {backToOperations}
          {state.status === "loading" ? (
            <FeedbackState
              description="Vos catégories sont en cours de chargement."
              kind="loading"
              title="Chargement des catégories"
            />
          ) : (
            <FeedbackState
              actions={[
                { label: "Réessayer", onPress: () => void state.retry() },
              ]}
              description="Vos données restent inchangées. Vérifiez votre connexion puis réessayez."
              kind="error"
              title="Catégories indisponibles"
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          state.categories.length === 0 && styles.emptyContent,
        ]}
        data={state.categories}
        keyExtractor={({ id }) => `${id}`}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            {backToOperations}
            <Text style={styles.eyebrow}>BUDGET DU QUOTIDIEN</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Catégories d’opérations
            </Text>
            <Text style={styles.subtitle}>
              Nommez et colorez les catégories qui classent vos entrées et vos
              dépenses.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => open(null)}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.actionPrimaryText}
                name="add-circle-outline"
                size={21}
              />
              <Text style={styles.addLabel}>Ajouter une catégorie</Text>
            </Pressable>
            {state.message && !isFormOpen ? (
              <FeedbackBanner
                kind={state.mutationStatus === "error" ? "error" : "success"}
              >
                {state.message}
              </FeedbackBanner>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FeedbackState
              actions={[
                {
                  label: "Créer ma première catégorie",
                  onPress: () => open(null),
                },
              ]}
              description="Créez une catégorie pour classer vos opérations."
              icon="pricetags-outline"
              kind="empty"
              title="Pas encore de catégorie"
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View
              style={[
                styles.swatch,
                item.color
                  ? { backgroundColor: item.color }
                  : styles.swatchNone,
              ]}
            />
            <View style={styles.cardText}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.color ? null : (
                <Text style={styles.cardHint}>Sans couleur</Text>
              )}
            </View>
            <Pressable
              accessibilityLabel={`Modifier ${item.name}`}
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={colors.actionSecondaryText}
                name="create-outline"
                size={22}
              />
            </Pressable>
          </View>
        )}
      />
      {isFormOpen ? (
        <CategoryFormModal
          key={edited?.id ?? "new"}
          category={edited}
          errorMessage={state.mutationStatus === "error" ? state.message : null}
          isSaving={state.mutationStatus === "loading"}
          onCancel={closeForm}
          onClearError={state.clearMessage}
          onDelete={remove}
          onSave={save}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: primitives.size.contentMd,
    padding: primitives.space["5"],
    paddingBottom: primitives.space["16"],
    width: "100%",
  },
  emptyContent: { flexGrow: 1 },
  backLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: primitives.space["1"],
    minHeight: semantic.size.controlMinHeight,
  },
  backLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: primitives.fontSize.xs,
    fontWeight: semibold,
    marginTop: primitives.space["2"],
  },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize["2xl"],
    fontWeight: semibold,
    lineHeight: 40,
    marginTop: primitives.space["2"],
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: 24,
    marginTop: primitives.space["2"],
  },
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: primitives.space["2"],
    justifyContent: "center",
    marginBottom: primitives.space["6"],
    marginTop: primitives.space["5"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  addLabel: {
    color: colors.actionPrimaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.8 },
  separator: { height: primitives.space["3"] },
  emptyState: { marginTop: primitives.space["6"] },
  card: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    flexDirection: "row",
    gap: primitives.space["3"],
    minHeight: primitives.size.controlMd + primitives.space["4"],
    paddingLeft: primitives.space["4"],
    paddingRight: primitives.space["2"],
  },
  swatch: {
    borderColor: colors.borderStrong,
    borderRadius: primitives.radius.pill,
    borderWidth: semantic.borderWidth.default,
    height: primitives.space["5"],
    width: primitives.space["5"],
  },
  swatchNone: { backgroundColor: colors.backgroundCanvas },
  cardText: { flex: 1, paddingVertical: primitives.space["3"] },
  cardName: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  cardHint: { color: colors.textMuted, fontSize: primitives.fontSize.sm },
  editButton: {
    alignItems: "center",
    height: primitives.size.controlMd,
    justifyContent: "center",
    width: primitives.size.controlMd,
  },
  centeredState: {
    flex: 1,
    gap: primitives.space["4"],
    justifyContent: "center",
    padding: primitives.space["6"],
  },
});

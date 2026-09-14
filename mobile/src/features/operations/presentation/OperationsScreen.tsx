import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  OneOffOperation,
  OperationDraft,
} from "@/src/features/operations/domain/oneOffOperation";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import { OperationCard } from "@/src/features/operations/presentation/OperationCard";
import { OperationFormModal } from "@/src/features/operations/presentation/OperationFormModal";
import { useOneOffOperations } from "@/src/features/operations/presentation/useOneOffOperations";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

export const OperationsScreen = () => {
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpOneOffOperationsGateway(httpClient),
    [httpClient],
  );
  const state = useOneOffOperations(gateway);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedOperation, setEditedOperation] =
    useState<OneOffOperation | null>(null);

  const openCreate = () => {
    setEditedOperation(null);
    setIsFormOpen(true);
  };
  const openEdit = (operation: OneOffOperation) => {
    setEditedOperation(operation);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEditedOperation(null);
    }
  };
  const save = async (draft: OperationDraft) => {
    const succeeded =
      editedOperation == null
        ? await state.createOperation(draft)
        : await state.updateOperation(editedOperation.id, draft);
    if (succeeded) closeForm();
  };
  const confirmDelete = () => {
    if (editedOperation == null) return;
    Alert.alert("Supprimer l’opération ?", "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          void state.deleteOperation(editedOperation.id).then((succeeded) => {
            if (succeeded) closeForm();
          });
        },
      },
    ]);
  };
  const categoryById = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category])),
    [state.categories],
  );

  if (state.status === "loading") {
    return (
      <CenteredState
        icon="wallet-outline"
        label="Chargement des opérations…"
        loading
      />
    );
  }
  if (state.status === "error") {
    return (
      <CenteredState
        icon="cloud-offline-outline"
        label="La liste est momentanément indisponible. Vos données restent inchangées."
        onRetry={() => void state.retry()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          state.operations.length === 0 && styles.emptyContent,
        ]}
        data={state.operations}
        keyExtractor={({ id }) => `${id}`}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>BUDGET DU QUOTIDIEN</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Vos opérations ponctuelles
            </Text>
            <Text style={styles.subtitle}>
              Retrouvez vos entrées et dépenses, des plus récentes aux plus
              anciennes.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={state.categories.length === 0}
              onPress={openCreate}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
                state.categories.length === 0 && styles.disabled,
              ]}
            >
              <Ionicons
                color={colors.actionPrimaryText}
                name="add-circle-outline"
                size={21}
              />
              <Text style={styles.addLabel}>Ajouter une opération</Text>
            </Pressable>
            {state.message ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.message,
                  state.mutationStatus === "error" ||
                  state.pageStatus === "error"
                    ? styles.errorMessage
                    : styles.successMessage,
                ]}
              >
                {state.message}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              color={colors.textSecondary}
              name="receipt-outline"
              size={42}
            />
            <Text style={styles.emptyTitle}>Pas encore d’opération</Text>
            <Text style={styles.emptyText}>
              Ajoutez votre première entrée ou dépense pour commencer à suivre
              votre budget.
            </Text>
          </View>
        }
        ListFooterComponent={
          state.meta?.hasNext ? (
            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                disabled={state.pageStatus === "loading"}
                onPress={() => void state.loadMore()}
                style={[
                  styles.loadMoreButton,
                  state.pageStatus === "loading" && styles.disabled,
                ]}
              >
                {state.pageStatus === "loading" ? (
                  <ActivityIndicator color={colors.actionSecondaryText} />
                ) : (
                  <Text style={styles.loadMoreLabel}>
                    {state.pageStatus === "error"
                      ? "Réessayer de charger la suite"
                      : "Afficher la suite"}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <OperationCard
            category={categoryById.get(item.categoryId)}
            operation={item}
            onEdit={openEdit}
          />
        )}
      />
      {isFormOpen ? (
        <OperationFormModal
          key={editedOperation?.id ?? "new"}
          categories={state.categories}
          isSaving={state.mutationStatus === "loading"}
          operation={editedOperation}
          visible
          onCancel={closeForm}
          onDelete={confirmDelete}
          onSave={(draft) => void save(draft)}
        />
      ) : null}
    </SafeAreaView>
  );
};

interface CenteredStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onRetry?: () => void;
}

const CenteredState = ({
  icon,
  label,
  loading = false,
  onRetry,
}: CenteredStateProps) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.centeredState}>
      {loading ? (
        <ActivityIndicator color={colors.statusInfoText} size="large" />
      ) : (
        <Ionicons color={colors.statusErrorText} name={icon} size={42} />
      )}
      <Text accessibilityLiveRegion="polite" style={styles.centeredLabel}>
        {label}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.addButton}
        >
          <Ionicons color={colors.actionPrimaryText} name="refresh" size={20} />
          <Text style={styles.addLabel}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    padding: primitives.space["5"],
    paddingBottom: primitives.space["16"],
  },
  emptyContent: { flexGrow: 1 },
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
  disabled: { opacity: 0.55 },
  separator: { height: primitives.space["3"] },
  message: {
    borderRadius: semantic.radius.control,
    fontSize: primitives.fontSize.sm,
    marginBottom: primitives.space["4"],
    padding: primitives.space["3"],
  },
  successMessage: {
    backgroundColor: colors.statusSuccessSurface,
    color: colors.statusSuccessText,
  },
  errorMessage: {
    backgroundColor: colors.statusErrorSurface,
    color: colors.statusErrorText,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: semantic.borderWidth.default,
    marginTop: primitives.space["6"],
    padding: semantic.space.card,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
    marginTop: primitives.space["3"],
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: 24,
    marginTop: primitives.space["2"],
    textAlign: "center",
  },
  footer: { alignItems: "center", paddingTop: primitives.space["6"] },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: colors.actionSecondaryBackground,
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  loadMoreLabel: {
    color: colors.actionSecondaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  centeredState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: primitives.space["6"],
  },
  centeredLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: 24,
    marginTop: primitives.space["4"],
    maxWidth: primitives.size.contentSm,
    textAlign: "center",
  },
});

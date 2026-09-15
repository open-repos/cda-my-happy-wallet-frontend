import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { primitives, semantic, themes } from "@/src/design/tokens";
import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import {
  FixedOperation,
  FixedOperationDraft,
  FixedOperationType,
} from "@/src/features/dashboard/domain/fixedBudget";
import { HttpFixedBudgetGateway } from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";
import { FixedOperationCard } from "@/src/features/dashboard/presentation/FixedOperationCard";
import { FixedOperationFormModal } from "@/src/features/dashboard/presentation/FixedOperationFormModal";
import { useFixedOperations } from "@/src/features/dashboard/presentation/useFixedOperations";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

export const FixedBudgetScreen = () => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpFixedBudgetGateway(httpClient),
    [httpClient],
  );
  const state = useFixedOperations(gateway);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [initialType, setInitialType] = useState<FixedOperationType>("CHARGE");
  const [editedOperation, setEditedOperation] = useState<FixedOperation | null>(
    null,
  );
  const sections = useMemo(
    () =>
      [
        {
          title: "Revenus fixes",
          data: state.operations.filter(({ type }) => type === "REVENU"),
        },
        {
          title: "Charges fixes",
          data: state.operations.filter(({ type }) => type === "CHARGE"),
        },
      ].filter(({ data }) => data.length > 0),
    [state.operations],
  );

  const openCreate = (type: FixedOperationType) => {
    setInitialType(type);
    setEditedOperation(null);
    setIsFormOpen(true);
  };
  const openEdit = (operation: FixedOperation) => {
    setInitialType(operation.type);
    setEditedOperation(operation);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEditedOperation(null);
    }
  };
  const save = async (draft: FixedOperationDraft) => {
    const succeeded =
      editedOperation == null
        ? await state.create(draft)
        : await state.update(editedOperation, draft);
    if (succeeded) closeForm();
  };
  const confirmDelete = () => {
    if (editedOperation == null) return;
    Alert.alert(
      "Supprimer cet élément ?",
      `${editedOperation.title} sera retiré de votre budget fixe.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void state.delete(editedOperation).then((succeeded) => {
              if (succeeded) closeForm();
            });
          },
        },
      ],
    );
  };

  if (state.status === "loading") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <FeedbackState
            description="Vos revenus et charges récurrents sont en cours de chargement."
            kind="loading"
            title="Chargement du budget fixe"
          />
        </View>
      </SafeAreaView>
    );
  }
  if (state.status === "error") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <FeedbackState
            actions={[
              {
                label: "Retour",
                onPress: () => router.back(),
                variant: "secondary",
              },
              { label: "Réessayer", onPress: () => void state.retry() },
            ]}
            description="Vérifiez votre connexion puis relancez le chargement."
            kind="error"
            title="Budget fixe indisponible"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <SectionList
        contentContainerStyle={[
          styles.content,
          state.operations.length === 0 && styles.emptyContent,
        ]}
        sections={sections}
        keyExtractor={({ id }) => `${id}`}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        SectionSeparatorComponent={() => (
          <View style={styles.sectionSeparator} />
        )}
        ListHeaderComponent={
          <View>
            <Pressable
              accessibilityLabel="Revenir au tableau de bord"
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                color={colors.textSecondary}
                name="arrow-back"
                size={21}
              />
              <Text style={styles.backLabel}>Tableau de bord</Text>
            </Pressable>
            <Text style={styles.eyebrow}>BUDGET MENSUEL</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Charges et revenus fixes
            </Text>
            <Text style={styles.subtitle}>
              Gérez les montants récurrents utilisés pour calculer votre reste à
              vivre.
            </Text>
            <View style={styles.createActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openCreate("REVENU")}
                style={({ pressed }) => [
                  styles.createButton,
                  styles.incomeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  color={colors.statusSuccessText}
                  name="add-circle-outline"
                  size={20}
                />
                <Text style={styles.incomeButtonLabel}>Ajouter un revenu</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => openCreate("CHARGE")}
                style={({ pressed }) => [
                  styles.createButton,
                  styles.expenseButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  color={colors.actionDangerText}
                  name="add-circle-outline"
                  size={20}
                />
                <Text style={styles.expenseButtonLabel}>
                  Ajouter une charge
                </Text>
              </Pressable>
            </View>
            {state.message != null ? (
              <FeedbackBanner
                kind={
                  state.mutationStatus === "error" ||
                  state.pageStatus === "error"
                    ? "error"
                    : "success"
                }
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
                  label: "Ajouter un revenu",
                  onPress: () => openCreate("REVENU"),
                },
                {
                  label: "Ajouter une charge",
                  onPress: () => openCreate("CHARGE"),
                  variant: "secondary",
                },
              ]}
              description="Ajoutez au moins un revenu et une charge pour obtenir un reste à vivre utile."
              icon="calculator-outline"
              kind="empty"
              title="Votre budget fixe est vide"
            />
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
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <FixedOperationCard operation={item} onEdit={openEdit} />
        )}
      />
      {isFormOpen ? (
        <FixedOperationFormModal
          key={editedOperation?.id ?? `new-${initialType}`}
          initialType={initialType}
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

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    padding: primitives.space["5"],
    paddingBottom: primitives.space["16"],
  },
  emptyContent: { flexGrow: 1 },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: primitives.space["2"],
    minHeight: primitives.size.controlSm,
  },
  backLabel: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: primitives.fontSize.xs,
    fontWeight: semibold,
    marginTop: primitives.space["3"],
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
  createActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: primitives.space["2"],
    marginBottom: primitives.space["5"],
    marginTop: primitives.space["5"],
  },
  createButton: {
    alignItems: "center",
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: primitives.space["2"],
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: primitives.space["3"],
  },
  incomeButton: { backgroundColor: colors.statusSuccessSurface },
  expenseButton: { backgroundColor: colors.actionDangerBackground },
  incomeButtonLabel: {
    color: colors.statusSuccessText,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  expenseButtonLabel: {
    color: colors.actionDangerText,
    fontSize: primitives.fontSize.sm,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.65 },
  sectionTitle: {
    backgroundColor: colors.backgroundCanvas,
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: semibold,
    paddingBottom: primitives.space["2"],
    paddingTop: primitives.space["4"],
  },
  separator: { height: primitives.space["2"] },
  sectionSeparator: { height: primitives.space["3"] },
  emptyState: {
    marginTop: primitives.space["6"],
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
    flex: 1,
    justifyContent: "center",
    padding: primitives.space["6"],
  },
});

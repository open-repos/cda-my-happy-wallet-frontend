import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  FinancialGoal,
  GoalDraft,
} from "@/src/features/goals/domain/financialGoal";
import { HttpFinancialGoalsGateway } from "@/src/features/goals/infrastructure/HttpFinancialGoalsGateway";
import { FinancialGoalCard } from "@/src/features/goals/presentation/FinancialGoalCard";
import { FinancialGoalFormModal } from "@/src/features/goals/presentation/FinancialGoalFormModal";
import { requestedGoal } from "@/src/features/goals/presentation/requestedGoal";
import { useFinancialGoals } from "@/src/features/goals/presentation/useFinancialGoals";

interface FinancialGoalsSectionProps {
  /**
   * Objectif à ouvrir en modification dès son chargement (« ajuster le
   * versement », #217), par exemple depuis le paramètre `ajuster` de l'URL.
   */
  initialGoalId?: number | null;
}

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

/** Section « Objectifs financiers » de l'onglet Objectifs (#226). */
export const FinancialGoalsSection = ({
  initialGoalId = null,
}: FinancialGoalsSectionProps) => {
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpFinancialGoalsGateway(httpClient),
    [httpClient],
  );
  const state = useFinancialGoals(gateway);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedGoal, setEditedGoal] = useState<FinancialGoal | null>(null);
  // Objectif demandé par `initialGoalId`, ouvert une seule fois dès qu'il est
  // chargé : dérivé au rendu, seule sa prise en compte est mémorisée.
  const [handledGoalId, setHandledGoalId] = useState<number | null>(null);
  const pendingGoal = requestedGoal(
    state.goals,
    initialGoalId,
    handledGoalId,
    isFormOpen,
  );
  const formGoal = isFormOpen ? editedGoal : pendingGoal;
  const isFormVisible = isFormOpen || pendingGoal != null;

  const open = (goal: FinancialGoal | null) => {
    state.clearMessage();
    setHandledGoalId(initialGoalId);
    setEditedGoal(goal);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setHandledGoalId(initialGoalId);
      setIsFormOpen(false);
      setEditedGoal(null);
    }
  };
  const save = async (draft: GoalDraft) => {
    const succeeded =
      formGoal == null
        ? await state.createGoal(draft)
        : await state.updateGoal(formGoal.id, draft);
    if (succeeded) closeForm();
  };
  // Suppression déjà confirmée dans le formulaire.
  const remove = async () => {
    if (formGoal == null) return;
    if (await state.deleteGoal(formGoal.id)) closeForm();
  };

  const canAdd = state.status === "success" && state.goals.length > 0;

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Objectifs financiers
      </Text>
      <Text style={styles.subtitle}>
        Suivez ce que vous mettez de côté et la date visée.
      </Text>
      {canAdd ? (
        <Pressable
          accessibilityRole="button"
          disabled={state.mutationStatus === "loading"}
          onPress={() => open(null)}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
        >
          <Ionicons
            color={colors.actionPrimaryText}
            name="add-circle-outline"
            size={21}
          />
          <Text style={styles.addLabel}>Ajouter un objectif</Text>
        </Pressable>
      ) : null}
      {/* Formulaire ouvert : le message s'affiche dans sa fenêtre. */}
      {state.message && !isFormVisible ? (
        <FeedbackBanner
          kind={state.mutationStatus === "error" ? "error" : "success"}
        >
          {state.message}
        </FeedbackBanner>
      ) : null}

      {state.status === "loading" && state.goals.length === 0 ? (
        <FeedbackState
          description="Vos objectifs financiers sont en cours de chargement."
          kind="loading"
          title="Chargement des objectifs"
        />
      ) : null}
      {state.status === "error" && state.goals.length === 0 ? (
        <FeedbackState
          actions={[{ label: "Réessayer", onPress: () => void state.retry() }]}
          description="Vos données restent inchangées. Vérifiez votre connexion puis réessayez."
          kind="error"
          title="Objectifs momentanément indisponibles"
        />
      ) : null}
      {state.status === "success" && state.goals.length === 0 ? (
        <FeedbackState
          actions={[
            { label: "Ajouter un objectif", onPress: () => open(null) },
          ]}
          description="Un voyage, un équipement, une réserve : indiquez le montant visé et ce que vous pouvez verser chaque mois."
          icon="flag-outline"
          kind="empty"
          title="Ajoutez votre premier objectif"
        />
      ) : null}

      <View style={styles.list}>
        {state.goals.map((goal) => (
          <FinancialGoalCard key={goal.id} goal={goal} onEdit={open} />
        ))}
      </View>

      {isFormVisible ? (
        <FinancialGoalFormModal
          key={formGoal?.id ?? "new"}
          errorMessage={state.mutationStatus === "error" ? state.message : null}
          goal={formGoal}
          isSaving={state.mutationStatus === "loading"}
          visible
          onCancel={closeForm}
          onDelete={() => void remove()}
          onSave={(draft) => void save(draft)}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: primitives.space["3"], marginTop: primitives.space["6"] },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: primitives.fontSize.md,
    lineHeight: 24,
  },
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: primitives.space["2"],
    justifyContent: "center",
    minHeight: semantic.size.controlMinHeight,
    paddingHorizontal: semantic.space.controlInline,
  },
  addLabel: {
    color: colors.actionPrimaryText,
    fontSize: primitives.fontSize.md,
    fontWeight: semibold,
  },
  pressed: { opacity: 0.8 },
  list: { gap: primitives.space["3"] },
});

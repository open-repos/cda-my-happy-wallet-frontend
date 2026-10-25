import { ActionButton } from "@/src/design/ActionButton";
import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
// Barre d'état Android comme encoche iOS (#147).
import { SafeAreaView } from "react-native-safe-area-context";

import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  EventDraft,
  MonthlyEvent,
} from "@/src/features/events/domain/monthlyEvent";
import { FinancialGoalsSection } from "@/src/features/goals/presentation/FinancialGoalsSection";
import { goalRequest } from "@/src/features/goals/presentation/requestedGoal";
import { HttpMonthlyEventsGateway } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";
import { MonthlyEventCard } from "@/src/features/events/presentation/MonthlyEventCard";
import { MonthlyEventFormModal } from "@/src/features/events/presentation/MonthlyEventFormModal";
import { useMonthlyEvents } from "@/src/features/events/presentation/useMonthlyEvents";

const colors = themes.light.color;
const semibold = `${primitives.fontWeight.semibold}` as "600";

/**
 * Onglet « Objectifs et événements » : objectifs financiers (#226) puis
 * événements mensuels (#225). `ajuster` ouvre un objectif en modification.
 */
export const MonthlyEventsScreen = () => {
  const { ajuster, demande } = useLocalSearchParams<{
    ajuster?: string;
    demande?: string;
  }>();
  const adjustRequest = useMemo(
    () => goalRequest(ajuster, demande),
    [ajuster, demande],
  );
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpMonthlyEventsGateway(httpClient),
    [httpClient],
  );
  const state = useMonthlyEvents(gateway);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedEvent, setEditedEvent] = useState<MonthlyEvent | null>(null);

  const openCreate = () => {
    state.clearMessage();
    setEditedEvent(null);
    setIsFormOpen(true);
  };
  const openEdit = (event: MonthlyEvent) => {
    state.clearMessage();
    setEditedEvent(event);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEditedEvent(null);
    }
  };
  const save = async (draft: EventDraft) => {
    const succeeded =
      editedEvent == null
        ? await state.createEvent(draft)
        : await state.updateEvent(editedEvent.id, draft);
    if (succeeded) closeForm();
  };
  // Suppression déjà confirmée dans le formulaire.
  const remove = async () => {
    if (editedEvent == null) return;
    if (await state.deleteEvent(editedEvent.id)) closeForm();
  };

  return (
    <SafeAreaView edges={TAB_SCREEN_EDGES} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={[
          styles.content,
          state.events.length === 0 && styles.emptyContent,
        ]}
        data={state.events}
        keyExtractor={({ id }) => `${id}`}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>PRÉVISIONS</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Objectifs et événements
            </Text>
            <Text style={styles.subtitle}>
              Anticipez les entrées et dépenses qui influenceront votre budget.
            </Text>
            <FinancialGoalsSection adjustRequest={adjustRequest} />
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Événements mensuels
            </Text>
            <ActionButton
              action="add"
              label="Ajouter un événement"
              accessibilityRole="button"
              disabled={state.mutationStatus === "loading"}
              onPress={openCreate}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.pressed,
              ]}
            ></ActionButton>
            {/* Formulaire ouvert : le message s'affiche dans sa fenêtre. */}
            {state.message && !isFormOpen ? (
              <FeedbackBanner
                kind={state.mutationStatus === "error" ? "error" : "success"}
              >
                {state.message}
              </FeedbackBanner>
            ) : null}
          </View>
        }
        // États des événements dans la liste : les objectifs, au-dessus,
        // restent visibles pendant un chargement ou un échec.
        ListEmptyComponent={
          state.status === "loading" ? (
            <FeedbackState
              description="Vos événements mensuels sont en cours de chargement."
              kind="loading"
              title="Chargement des événements"
            />
          ) : state.status === "error" ? (
            <FeedbackState
              actions={[
                { label: "Réessayer", onPress: () => void state.retry() },
              ]}
              description={state.loadError}
              kind="error"
              title="Événements indisponibles"
            />
          ) : (
            <FeedbackState
              actions={[{ label: "Ajouter un événement", onPress: openCreate }]}
              description="Ajoutez un loyer, une assurance ou une rentrée prévue : elle apparaîtra dans votre calendrier."
              icon="calendar-outline"
              kind="empty"
              title="Aucun événement prévu"
            />
          )
        }
        renderItem={({ item }) => (
          <MonthlyEventCard event={item} onEdit={openEdit} />
        )}
      />
      {isFormOpen ? (
        <MonthlyEventFormModal
          key={editedEvent?.id ?? "new"}
          errorMessage={state.mutationStatus === "error" ? state.message : null}
          event={editedEvent}
          isSaving={state.mutationStatus === "loading"}
          visible
          onCancel={closeForm}
          onDelete={() => void remove()}
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
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.xl,
    fontWeight: semibold,
    marginBottom: primitives.space["3"],
    marginTop: primitives.space["6"],
  },
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    flexDirection: "row",
    gap: primitives.space["2"],
    justifyContent: "center",
    marginBottom: primitives.space["3"],
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
});

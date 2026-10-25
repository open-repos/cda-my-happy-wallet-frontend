import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { themes } from "@/src/design/tokens";
import { FeedbackBanner } from "@/src/design/FeedbackState";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { OneOffOperation } from "@/src/features/operations/domain/oneOffOperation";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import { useOneOffOperations } from "@/src/features/operations/presentation/useOneOffOperations";
import { OperationCard } from "@/src/features/operations/presentation/OperationCard";
import { OperationFormModal } from "@/src/features/operations/presentation/OperationFormModal";
import { HttpMonthlyEventsGateway } from "@/src/features/events/infrastructure/HttpMonthlyEventsGateway";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import { CalendarElement } from "../domain/calendarContent";
import { PendingOccurrence } from "../domain/pendingOccurrence";
import { longDate } from "../domain/budgetCalendar";
export const CalendarElements = ({
  items,
  busy,
  onRealize,
  onCancel,
  onChanged,
}: {
  items: CalendarElement[];
  busy: boolean;
  onRealize: (o: PendingOccurrence) => void;
  onCancel: (o: PendingOccurrence) => void;
  onChanged: () => void;
}) => {
  const { httpClient } = useAuth();
  const gateway = useMemo(
    () => new HttpOneOffOperationsGateway(httpClient),
    [httpClient],
  );
  const events = useMemo(
    () => new HttpMonthlyEventsGateway(httpClient),
    [httpClient],
  );
  const state = useOneOffOperations(gateway),
    simulation = useSimulation();
  const [edited, setEdited] = useState<OneOffOperation | null>(null);
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const changed = () => {
    setEdited(null);
    simulation.invalidate();
    onChanged();
  };
  const byId = new Map(state.categories.map((c) => [c.id, c]));
  return (
    <View style={styles.list}>
      {state.message && (
        <FeedbackBanner
          kind={state.mutationStatus === "error" ? "error" : "success"}
        >
          {state.message}
        </FeedbackBanner>
      )}
      {items.map((item) => (
        <View key={item.key} style={styles.card}>
          {item.operation ? (
            <OperationCard
              operation={item.operation}
              category={byId.get(item.operation.categoryId)}
              onEdit={setEdited}
            />
          ) : (
            <>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>
                {longDate(item.date)} ·{" "}
                {item.kind === "ENTREE" ? "Entrée" : "Dépense"} ·{" "}
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: item.currency,
                }).format(Number(item.amount))}
              </Text>
            </>
          )}
          <Text style={styles.text}>
            {item.statusLabel}
            {item.overdue ? " · en retard" : ""}
          </Text>
          {item.resolution && (
            <Text style={styles.text}>
              Occurrence du {longDate(item.resolution.occurrenceDate)}
              {item.resolution.operation
                ? ` · opération liée : ${item.resolution.operation.title}`
                : ""}
            </Text>
          )}
          {item.nature === "planned" && item.occurrence && (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                style={styles.button}
                onPress={() => onRealize(item.occurrence!)}
              >
                <Text style={styles.buttonText}>
                  Convertir {item.title} en opération
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                style={styles.button}
                onPress={() => onCancel(item.occurrence!)}
              >
                <Text style={styles.buttonText}>Annuler {item.title}</Text>
              </Pressable>
            </View>
          )}
          {item.nature === "potential" && item.event && (
            <Pressable
              accessibilityRole="button"
              disabled={busy || simulation.mutationStatus === "loading"}
              style={styles.button}
              onPress={() =>
                void simulation.mutate(
                  () => events.confirmPotentialEvent(item.event!.id),
                  "Événement confirmé, toujours prévu.",
                )
              }
            >
              <Text style={styles.buttonText}>Confirmer {item.title}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {edited && (
        <OperationFormModal
          visible
          operation={edited}
          categories={state.categories}
          isSaving={state.mutationStatus === "loading"}
          errorMessage={state.mutationStatus === "error" ? state.message : null}
          onCancel={() => setEdited(null)}
          onSave={(draft) =>
            void state.updateOperation(edited.id, draft).then((ok) => {
              if (ok) changed();
            })
          }
          onDelete={() =>
            Alert.alert(
              `Supprimer « ${edited.title} » ?`,
              "Cette action est définitive.",
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Supprimer",
                  style: "destructive",
                  onPress: () =>
                    void state.deleteOperation(edited.id).then((ok) => {
                      if (ok) changed();
                    }),
                },
              ],
            )
          }
        />
      )}
    </View>
  );
};
const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
    list: { gap: 12 },
    card: {
      gap: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      backgroundColor: colors.backgroundSurface,
    },
    title: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
    text: { fontSize: 14, color: colors.textPrimary, flexShrink: 1 },
    actions: { gap: 8 },
    button: {
      minHeight: 48,
      justifyContent: "center",
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 8,
      backgroundColor: colors.actionSecondaryBackground,
    },
    buttonText: {
      color: colors.actionSecondaryText,
      fontSize: 16,
      flexShrink: 1,
    },
  });

import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Button } from "@/src/design/Button";
import { themes } from "@/src/design/tokens";
import { FeedbackBanner } from "@/src/design/FeedbackState";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import { OneOffOperation } from "@/src/features/operations/domain/oneOffOperation";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import { useOneOffOperations } from "@/src/features/operations/presentation/useOneOffOperations";
import { OperationCard } from "@/src/features/operations/presentation/OperationCard";
import { OperationFormModal } from "@/src/features/operations/presentation/OperationFormModal";
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
              <Button
                label="Convertir en opération"
                accessibilityLabel={`Convertir ${item.title} en opération`}
                icon="swap-horizontal-outline"
                variant="primary"
                disabled={busy}
                onPress={() => onRealize(item.occurrence!)}
              />
              <Button
                label="Annuler"
                accessibilityLabel={`Annuler ${item.title}`}
                icon="close-outline"
                disabled={busy}
                onPress={() => onCancel(item.occurrence!)}
              />
            </View>
          )}
          {item.nature === "potential" && (
            <Text style={styles.text}>
              Modification, confirmation et suppression dans le panneau
              Simulation.
            </Text>
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
  });

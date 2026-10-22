import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TAB_SCREEN_EDGES } from "@/src/design/safeArea";

import { semantic, themes } from "@/src/design/tokens";
import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  CALENDAR_MODES,
  CalendarMode,
  WEEKDAY_LABELS,
  dayCell,
  longDate,
  monthGrid,
  monthTitle,
  shiftMonth,
} from "@/src/features/budget/domain/budgetCalendar";
import {
  currentParisDate,
  currentParisMonth,
} from "@/src/features/budget/domain/budgetSummary";
import {
  PendingOccurrence,
  closesRealizeForm,
  decisionErrorMessage,
} from "@/src/features/budget/domain/pendingOccurrence";
import { HttpBudgetSummaryGateway } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
import { HttpOccurrencesGateway } from "@/src/features/budget/infrastructure/HttpOccurrencesGateway";
import { PendingOccurrencesSection } from "@/src/features/budget/presentation/PendingOccurrencesSection";
import { RealizeOccurrenceModal } from "@/src/features/budget/presentation/RealizeOccurrenceModal";
import { useBudgetCalendar } from "@/src/features/budget/presentation/useBudgetCalendar";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import { OperationCard } from "@/src/features/operations/presentation/OperationCard";
import { SimulationPanel } from "@/src/features/simulation/presentation/SimulationPanel";
import { SimulationReadout } from "@/src/features/simulation/presentation/SimulationReadout";

const colors = themes.light.color;

/** Calendrier budgétaire du mois : grille, modes, détail du jour, opérations. */
export const BudgetCalendarScreen = () => {
  const router = useRouter();
  const { httpClient } = useAuth();
  const budgetGateway = useMemo(
    () => new HttpBudgetSummaryGateway(httpClient),
    [httpClient],
  );
  const operationsGateway = useMemo(
    () => new HttpOneOffOperationsGateway(httpClient),
    [httpClient],
  );
  const occurrencesGateway = useMemo(
    () => new HttpOccurrencesGateway(httpClient),
    [httpClient],
  );
  const today = currentParisDate();
  const [month, setMonth] = useState(currentParisMonth());
  const [mode, setMode] = useState<CalendarMode>("markers");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [realizing, setRealizing] = useState<PendingOccurrence | null>(null);
  const [realizeError, setRealizeError] = useState<string | null>(null);
  const state = useBudgetCalendar(
    budgetGateway,
    occurrencesGateway,
    operationsGateway,
    month,
    selectedDate,
  );

  const confirmCancel = (occurrence: PendingOccurrence) => {
    Alert.alert(
      "Annuler cet événement ?",
      `${occurrence.title} du ${longDate(occurrence.occurrenceDate)} ne sera plus compté dans le prévisionnel. Aucune opération ne sera créée.`,
      [
        { text: "Garder", style: "cancel" },
        {
          text: "Annuler l’événement",
          style: "destructive",
          onPress: () => void state.cancel(occurrence),
        },
      ],
    );
  };

  const days = useMemo(
    () => new Map((state.summary?.days ?? []).map((day) => [day.date, day])),
    [state.summary],
  );
  const categoryById = useMemo(
    () => new Map(state.categories.map((category) => [category.id, category])),
    [state.categories],
  );
  const cells = useMemo(() => monthGrid(month, today), [month, today]);
  // Semaines en lignes explicites : sur Android, sept cases à 14,2857 %
  // dépassaient 100 % une fois arrondies et la septième passait à la ligne.
  const weeks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) =>
        cells.slice(index * 7, index * 7 + 7),
      ),
    [cells],
  );
  const changeMonth = (offset: number) => {
    setSelectedDate(null);
    setMonth((current) => shiftMonth(current, offset));
  };

  return (
    <SafeAreaView edges={TAB_SCREEN_EDGES} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>BUDGET</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Calendrier
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/(app)/upcoming-months")}
            style={({ pressed }) => [
              styles.upcomingLink,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={colors.actionSecondaryText}
              name="trending-up-outline"
              size={20}
            />
            <Text style={styles.upcomingLabel}>Prochains mois</Text>
          </Pressable>
        </View>

        <SimulationReadout month={month} />

        <View style={styles.monthBar}>
          <Pressable
            accessibilityLabel="Mois précédent"
            accessibilityRole="button"
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={colors.textPrimary}
              name="chevron-back"
              size={24}
            />
          </Pressable>
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="header"
            style={styles.monthTitle}
          >
            {monthTitle(month)}
          </Text>
          <Pressable
            accessibilityLabel="Mois suivant"
            accessibilityRole="button"
            onPress={() => changeMonth(1)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={colors.textPrimary}
              name="chevron-forward"
              size={24}
            />
          </Pressable>
        </View>

        <View
          accessibilityLabel="Contenu des jours"
          accessibilityRole="radiogroup"
          style={styles.modes}
        >
          {CALENDAR_MODES.map((option) => {
            const checked = option.value === mode;
            return (
              <Pressable
                accessibilityRole="radio"
                aria-checked={checked}
                key={option.value}
                onPress={() => setMode(option.value)}
                style={[styles.mode, checked && styles.modeActive]}
              >
                <Text
                  style={[styles.modeText, checked && styles.modeTextActive]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {state.summaryStatus === "error" ? (
          <FeedbackState
            actions={[{ label: "Réessayer", onPress: state.retry }]}
            description="Vérifiez votre connexion puis relancez le chargement."
            kind="error"
            title="Calendrier indisponible"
          />
        ) : (
          <View style={styles.calendar}>
            {state.summaryStatus === "loading" ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.actionPrimaryBackground} />
                <Text style={styles.legendText}>Chargement du mois…</Text>
              </View>
            ) : null}
            {state.summaryStatus === "future" ? (
              <Text style={styles.notice}>
                Ce mois n’a pas encore commencé : son budget sera calculé à
                partir du 1er {monthTitle(month)}.
              </Text>
            ) : null}
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.week}
            >
              {WEEKDAY_LABELS.map((weekday) => (
                <Text key={weekday.long} style={styles.weekday}>
                  {weekday.short}
                </Text>
              ))}
            </View>
            <View
              accessibilityState={{ busy: state.summaryStatus === "loading" }}
              style={styles.grid}
            >
              {weeks.map((week) => (
                <View key={week[0].date} style={styles.weekRow}>
                  {week.map((cell) => {
                    if (!cell.inMonth) {
                      return (
                        <View
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          key={cell.date}
                          style={styles.cell}
                        >
                          <Text style={styles.outsideDay}>{cell.day}</Text>
                        </View>
                      );
                    }
                    const content = dayCell(
                      cell.date,
                      days.get(cell.date),
                      mode,
                      "EUR",
                      state.summaryStatus === "loading",
                    );
                    const selected = cell.date === selectedDate;
                    return (
                      <Pressable
                        accessibilityHint={
                          selected
                            ? "Affiche de nouveau tout le mois"
                            : "Affiche les opérations de ce jour"
                        }
                        accessibilityLabel={`${content.accessibilityLabel}${
                          cell.isToday ? " Aujourd’hui." : ""
                        }`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={cell.date}
                        onPress={() =>
                          setSelectedDate(selected ? null : cell.date)
                        }
                        style={({ pressed }) => [
                          styles.cell,
                          styles.dayCell,
                          cell.isToday && styles.today,
                          selected && styles.selected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            selected && styles.selectedText,
                          ]}
                        >
                          {cell.day}
                        </Text>
                        {content.value !== null ? (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dayValue,
                              selected && styles.selectedText,
                            ]}
                          >
                            {content.value}
                          </Text>
                        ) : (
                          <View style={styles.markers}>
                            {mode === "markers" && content.markers.operation ? (
                              <View style={styles.operationDot} />
                            ) : null}
                            {mode === "markers" && content.markers.planned ? (
                              <View style={styles.plannedDot} />
                            ) : null}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            {mode === "markers" ? (
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={styles.operationDot} />
                  <Text style={styles.legendText}>Opération réelle</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.plannedDot} />
                  <Text style={styles.legendText}>Événement prévu</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.legendText}>
                {mode === "expenses"
                  ? "Dépenses réelles du jour, en euros (k = milliers)."
                  : "Reste prévisionnel en fin de journée, en euros (k = milliers)."}
              </Text>
            )}
          </View>
        )}

        {state.feedback && realizing === null ? (
          <FeedbackBanner
            kind={state.feedback.tone === "error" ? "error" : "success"}
          >
            {state.feedback.text}
          </FeedbackBanner>
        ) : null}

        {state.summaryStatus === "success" ||
        state.summaryStatus === "future" ? (
          <PendingOccurrencesSection
            busy={state.decision}
            error={state.pendingError}
            onRetry={state.retry}
            occurrences={state.pending}
            onCancel={confirmCancel}
            onRealize={(occurrence) => {
              setRealizeError(null);
              setRealizing(occurrence);
            }}
            selectedDate={selectedDate}
          />
        ) : null}

        <View style={styles.operationsHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {selectedDate
              ? `Opérations du ${longDate(selectedDate)}`
              : "Opérations du mois"}
          </Text>
          {selectedDate ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedDate(null)}
              style={({ pressed }) => [
                styles.linkButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.linkText}>Tout le mois</Text>
            </Pressable>
          ) : null}
        </View>

        {state.operationsStatus === "loading" ? (
          <FeedbackState
            description="Vos opérations sont en cours de chargement."
            kind="loading"
            title="Chargement des opérations"
          />
        ) : state.operationsStatus === "error" ? (
          <FeedbackState
            actions={[{ label: "Réessayer", onPress: state.retry }]}
            description="Vérifiez votre connexion puis réessayez."
            kind="error"
            title="Opérations indisponibles"
          />
        ) : state.operations.length === 0 ? (
          <FeedbackState
            description={
              selectedDate
                ? "Aucune opération ce jour-là."
                : "Aucune opération ce mois-ci."
            }
            icon="calendar-clear-outline"
            kind="empty"
            title="Rien à afficher"
          />
        ) : (
          <View style={styles.list}>
            {state.operations.map((operation) => (
              <OperationCard
                category={categoryById.get(operation.categoryId)}
                key={operation.id}
                operation={operation}
              />
            ))}
            {state.pagingError ? (
              <Text accessibilityLiveRegion="polite" style={styles.pagingError}>
                La suite des opérations n’a pas pu être chargée. Réessayez.
              </Text>
            ) : null}
            {state.hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={state.operationsStatus === "paging"}
                onPress={() => void state.loadMore()}
                style={({ pressed }) => [
                  styles.moreButton,
                  pressed && styles.pressed,
                ]}
              >
                {state.operationsStatus === "paging" ? (
                  <ActivityIndicator color={colors.actionPrimaryText} />
                ) : (
                  <Text style={styles.moreText}>Charger plus</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
        <SimulationPanel />
      </ScrollView>
      <RealizeOccurrenceModal
        key={
          realizing
            ? `${realizing.eventId}-${realizing.occurrenceDate}`
            : "closed"
        }
        busy={state.decision}
        categories={state.categories}
        categoriesError={state.categoriesError}
        errorMessage={realizeError}
        onRetryCategories={state.retry}
        occurrence={realizing}
        onCancel={() => setRealizing(null)}
        onSave={(body) => {
          if (realizing === null) return;
          void state.realize(realizing, body).then((result) => {
            if (result === null) return;
            if (closesRealizeForm(result)) {
              setRealizing(null);
            } else {
              setRealizeError(decisionErrorMessage(result.code));
            }
          });
        }}
        today={today}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.backgroundCanvas, flex: 1 },
  content: {
    gap: 20,
    paddingBottom: 40,
    // 360 − 2×16 − 2×4 (grille) − 2 (bordure) = 318 : cases de 45 px ≥ 44.
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: { gap: 6 },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: "700" },
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: "700" },
  upcomingLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    minHeight: semantic.size.controlMinHeight,
  },
  upcomingLabel: {
    color: colors.actionSecondaryText,
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  monthBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  monthTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  modes: {
    borderColor: colors.borderStrong,
    borderRadius: semantic.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
  },
  mode: {
    alignItems: "center",
    borderRadius: semantic.radius.control,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  modeActive: { backgroundColor: colors.actionPrimaryBackground },
  modeText: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  modeTextActive: { color: colors.actionPrimaryText },
  calendar: {
    backgroundColor: colors.backgroundSurface,
    borderColor: colors.borderSubtle,
    borderRadius: semantic.radius.card,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  notice: { color: colors.statusInfoText, fontSize: 14, lineHeight: 20 },
  week: { flexDirection: "row" },
  weekday: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  grid: { gap: 0 },
  weekRow: { flexDirection: "row" },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minHeight: 52,
  },
  dayCell: { borderRadius: 10, gap: 2, paddingVertical: 4 },
  today: { borderColor: colors.accent, borderWidth: 2 },
  selected: { backgroundColor: colors.actionPrimaryBackground },
  selectedText: { color: colors.actionPrimaryText },
  dayNumber: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  outsideDay: { color: colors.borderStrong, fontSize: 15, opacity: 0.4 },
  dayValue: {
    color: colors.textSecondary,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  markers: { flexDirection: "row", gap: 3, minHeight: 8 },
  operationDot: {
    backgroundColor: colors.dataExpense,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  plannedDot: {
    borderColor: colors.dataForecast,
    borderRadius: 4,
    // Anneau plein : un pointillé de 8 px s'affiche en arcs brisés sur Android.
    borderWidth: 2,
    height: 8,
    width: 8,
  },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendText: { color: colors.textMuted, fontSize: 13 },
  operationsHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "700" },
  linkButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 8 },
  linkText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  list: { gap: 12 },
  pagingError: { color: colors.statusErrorText, fontSize: 14 },
  moreButton: {
    alignItems: "center",
    backgroundColor: colors.actionPrimaryBackground,
    borderRadius: semantic.radius.control,
    justifyContent: "center",
    minHeight: 44,
  },
  moreText: {
    color: colors.actionPrimaryText,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: { opacity: 0.7 },
});

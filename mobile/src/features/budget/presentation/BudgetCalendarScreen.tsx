import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
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
import { RealizeOccurrenceModal } from "@/src/features/budget/presentation/RealizeOccurrenceModal";
import { useBudgetCalendar } from "@/src/features/budget/presentation/useBudgetCalendar";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import { SimulationPanel } from "@/src/features/simulation/presentation/SimulationPanel";
import { SimulationReadout } from "@/src/features/simulation/presentation/SimulationReadout";

import { HttpCalendarContentGateway } from "../infrastructure/HttpCalendarContentGateway";
import { useCalendarContent } from "./useCalendarContent";
import { CalendarElements } from "./CalendarElements";
import { CALENDAR_TYPES, calendarCounts } from "../domain/calendarContent";
import { useQuickAdd } from "@/src/features/quick-add/presentation/QuickAddProvider";

/** Calendrier budgétaire du mois : grille, modes, détail du jour, opérations. */
export const BudgetCalendarScreen = () => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const quickAdd = useQuickAdd();
  const { setCalendarDate } = quickAdd;
  const addButton = useRef<View>(null);
  const today = currentParisDate();
  const [month, setMonth] = useState(currentParisMonth());
  const [mode, setMode] = useState<CalendarMode>("markers");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const creationDate =
    selectedDate ?? (today.startsWith(month) ? today : `${month}-01`);
  useFocusEffect(
    useCallback(() => {
      setCalendarDate(creationDate);
      return () => setCalendarDate(null);
    }, [creationDate, setCalendarDate]),
  );
  const [realizing, setRealizing] = useState<PendingOccurrence | null>(null);
  const [realizeError, setRealizeError] = useState<string | null>(null);
  const state = useBudgetCalendar(
    budgetGateway,
    occurrencesGateway,
    operationsGateway,
    month,
    selectedDate,
  );

  const contentGateway = useMemo(
    () => new HttpCalendarContentGateway(httpClient),
    [httpClient],
  );
  const content = useCalendarContent(contentGateway, month);
  const refreshContent = () => {
    content.retry();
    state.retry();
  };
  const visibleItems = content.items.filter((item) =>
    selectedDate ? item.date === selectedDate : item.date.startsWith(month),
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
          onPress: () =>
            void state.cancel(occurrence).then((result) => {
              if (result?.ok) content.retry();
            }),
        },
      ],
    );
  };

  const days = useMemo(
    () => new Map((state.summary?.days ?? []).map((day) => [day.date, day])),
    [state.summary],
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

        <Pressable
          accessibilityRole="button"
          ref={addButton}
          accessibilityLabel={`Ajouter le ${longDate(creationDate)}`}
          onPress={() => quickAdd.open(creationDate, addButton.current)}
          style={styles.upcomingLink}
        >
          <Ionicons
            color={colors.actionSecondaryText}
            name="add-circle-outline"
            size={24}
          />
          <Text
            style={styles.upcomingLabel}
          >{`Ajouter le ${longDate(creationDate)}`}</Text>
        </Pressable>

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
                    const cellContent = dayCell(
                      cell.date,
                      days.get(cell.date),
                      mode,
                      "EUR",
                      state.summaryStatus === "loading",
                    );
                    const counts = calendarCounts(
                      content.items.filter((item) => item.date === cell.date),
                    );
                    const markers = CALENDAR_TYPES.filter(
                      (type) => counts[type.key] > 0,
                    );
                    const selected = cell.date === selectedDate;
                    return (
                      <Pressable
                        accessibilityHint={
                          selected
                            ? "Affiche de nouveau tout le mois"
                            : "Affiche les opérations de ce jour"
                        }
                        accessibilityLabel={`${longDate(cell.date)}.${cellContent.value ? ` ${mode === "expenses" ? "Dépenses" : "Reste prévisionnel"} ${cellContent.value} EUR.` : ""}${
                          (cell.isToday ? " Aujourd’hui." : "") +
                          (content.status === "success"
                            ? markers
                                .map(
                                  (type) =>
                                    ` ${counts[type.key]} ${type.label}.`,
                                )
                                .join("")
                            : content.status === "error"
                              ? " Contenu indisponible."
                              : " Chargement du contenu.")
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
                        {cellContent.value !== null ? (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dayValue,
                              selected && styles.selectedText,
                            ]}
                          >
                            {cellContent.value}
                          </Text>
                        ) : null}
                        <View style={styles.markers}>
                          {content.status === "success" &&
                            markers.map((type) => (
                              <Text
                                key={type.key}
                                style={[
                                  styles.markerSymbol,
                                  selected && styles.selectedText,
                                ]}
                                importantForAccessibility="no"
                                aria-hidden
                              >
                                {type.symbol}
                              </Text>
                            ))}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.legend}>
              {CALENDAR_TYPES.map((type) => (
                <View key={type.key} style={styles.legendItem}>
                  <Text style={styles.markerSymbol} aria-hidden>
                    {type.symbol}
                  </Text>
                  <Text style={styles.legendText}>{type.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {state.feedback && realizing === null ? (
          <FeedbackBanner
            kind={state.feedback.tone === "error" ? "error" : "success"}
          >
            {state.feedback.text}
          </FeedbackBanner>
        ) : null}

        <View style={styles.operationsHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {selectedDate
              ? `Éléments du ${longDate(selectedDate)}`
              : "Éléments du mois"}
          </Text>
          {selectedDate && (
            <Pressable
              accessibilityRole="button"
              style={styles.linkButton}
              onPress={() => setSelectedDate(null)}
            >
              <Text style={styles.linkText}>Tout le mois</Text>
            </Pressable>
          )}
        </View>
        {content.status === "loading" ? (
          <FeedbackState
            kind="loading"
            title="Chargement des éléments"
            description="Toutes les pages du mois sont en cours de lecture."
          />
        ) : content.status === "error" ? (
          <FeedbackState
            kind="error"
            title="Éléments indisponibles"
            description="Le chargement est incomplet. Réessayez pour consulter le jour."
            actions={[
              { label: "Réessayer les éléments", onPress: refreshContent },
            ]}
          />
        ) : visibleItems.length === 0 ? (
          <FeedbackState
            kind="empty"
            title="Aucun élément"
            description={
              selectedDate ? "Aucun élément ce jour." : "Aucun élément ce mois."
            }
          />
        ) : (
          <CalendarElements
            items={visibleItems}
            busy={state.decision}
            onChanged={refreshContent}
            onCancel={confirmCancel}
            onRealize={(occurrence) => {
              setRealizeError(null);
              setRealizing(occurrence);
            }}
          />
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
              content.retry();
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

const makeStyles = (
  colors: typeof themes.light.color | typeof themes.dark.color,
) =>
  StyleSheet.create({
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
    markers: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 3,
      minHeight: 16,
    },
    markerSymbol: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
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
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    linkButton: {
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 8,
    },
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

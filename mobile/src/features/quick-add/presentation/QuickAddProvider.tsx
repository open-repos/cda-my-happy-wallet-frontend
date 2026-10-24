import Ionicons from "@expo/vector-icons/Ionicons";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { FeedbackBanner, FeedbackState } from "@/src/design/FeedbackState";
import { primitives, themes } from "@/src/design/tokens";
import { useAuth } from "@/src/features/auth/presentation/AuthProvider";
import {
  currentParisDate,
  currentParisMonth,
} from "@/src/features/budget/domain/budgetSummary";
import { longDate } from "@/src/features/budget/domain/budgetCalendar";
import { EventDraft } from "@/src/features/events/domain/monthlyEvent";
import { MonthlyEventFormModal } from "@/src/features/events/presentation/MonthlyEventFormModal";
import {
  OperationCategory,
  OperationDraft,
} from "@/src/features/operations/domain/oneOffOperation";
import { HttpOneOffOperationsGateway } from "@/src/features/operations/infrastructure/HttpOneOffOperationsGateway";
import { OperationFormModal } from "@/src/features/operations/presentation/OperationFormModal";
import {
  QuickAddKind,
  writeQuickAdd,
} from "@/src/features/quick-add/application/QuickAddWriter";
import { useSimulation } from "@/src/features/simulation/presentation/SimulationContext";
import { potentialMinStartDate } from "@/src/features/simulation/domain/potential";

type Panel = { kind: QuickAddKind | "menu"; date: string };
const QuickAddContext = createContext({
  open: (_date?: string, _source?: View | null) => {},
  setCalendarDate: (_date: string | null) => {},
});
export const useQuickAdd = () => useContext(QuickAddContext);
const choices = [
  ["expense", "Dépense", "Opération réelle", "arrow-up-outline"],
  ["income", "Entrée", "Opération réelle", "arrow-down-outline"],
  [
    "event",
    "Événement confirmé",
    "Prévu, pas encore réalisé",
    "calendar-outline",
  ],
  [
    "potential",
    "Événement à confirmer",
    "Simulation · aucun impact sur le réel",
    "time-outline",
  ],
] as const;
const colors = themes.light.color;

export const QuickAddProvider = ({ children }: { children: ReactNode }) => {
  const { httpClient } = useAuth();
  const simulation = useSimulation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [calendarDate, setCalendarDate] = useState<string | null>(null),
    [panel, setPanel] = useState<Panel | null>(null),
    [categories, setCategories] = useState<OperationCategory[]>([]),
    [categoryStatus, setCategoryStatus] = useState("idle"),
    [error, setError] = useState<string | null>(null),
    [success, setSuccess] = useState<string | null>(null),
    [keyboard, setKeyboard] = useState(false);
  const busy = useRef(false);
  const fab = useRef<View>(null);
  const source = useRef<View | null>(null);
  const gateway = useMemo(
    () => new HttpOneOffOperationsGateway(httpClient),
    [httpClient],
  );
  const open = useCallback(
    (date?: string, trigger?: View | null) => {
      if (busy.current) return;
      source.current = trigger ?? null;
      setError(null);
      setSuccess(null);
      setPanel({
        kind: "menu",
        date: date ?? calendarDate ?? currentParisDate(),
      });
    },
    [calendarDate],
  );
  const restore = () =>
    requestAnimationFrame(() => {
      const target = source.current ?? fab.current;
      if (Platform.OS === "web") {
        (target as unknown as { focus?: () => void } | null)?.focus?.();
      } else {
        const node = findNodeHandle(target);
        if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
      }
    });
  const close = () => {
    if (busy.current) return;
    Keyboard.dismiss();
    setPanel(null);
    setError(null);
    restore();
  };
  const loadCategories = useCallback(async () => {
    setCategoryStatus("loading");
    try {
      setCategories(await gateway.listAllCategories());
      setCategoryStatus("success");
    } catch {
      setCategoryStatus("error");
    }
  }, [gateway]);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboard(true),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const save = async (draft: OperationDraft | EventDraft) => {
    if (busy.current || !panel || panel.kind === "menu") return;
    busy.current = true;
    setError(null);
    const kind = panel.kind;
    const ok = await simulation.mutate(
      () => writeQuickAdd(httpClient, kind, draft),
      kind === "potential"
        ? "Événement à confirmer ajouté à la Simulation. Le réel reste inchangé."
        : "Ajout enregistré.",
    );
    busy.current = false;
    if (ok) {
      Keyboard.dismiss();
      setPanel(null);
      setSuccess(
        kind === "potential"
          ? "Événement à confirmer enregistré. Activez la Simulation pour voir son effet."
          : "Ajout enregistré.",
      );
      restore();
    } else
      setError(
        "L’ajout n’a pas pu être enregistré. Vérifiez les champs puis réessayez.",
      );
  };
  const saving = simulation.mutationStatus === "loading";
  const operationPanel = panel?.kind === "expense" || panel?.kind === "income";
  return (
    <QuickAddContext.Provider value={{ open, setCalendarDate }}>
      <View style={styles.root}>
        {children}
        {success && !panel ? (
          <View style={[styles.feedback, { bottom: 80 + insets.bottom }]}>
            <FeedbackBanner kind="success">{success}</FeedbackBanner>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSuccess(null)}
              style={styles.dismiss}
            >
              <Text style={styles.text}>Fermer le message</Text>
            </Pressable>
          </View>
        ) : null}
        {width < 768 && !keyboard ? (
          <Pressable
            ref={fab}
            accessibilityLabel="Ajouter une opération ou un événement"
            accessibilityRole="button"
            disabled={saving}
            onPress={() => open()}
            style={[
              styles.fab,
              { bottom: 80 + insets.bottom, display: panel ? "none" : "flex" },
            ]}
          >
            <Ionicons color={colors.actionPrimaryText} name="add" size={28} />
          </Pressable>
        ) : null}
        <Modal
          animationType="slide"
          visible={
            panel?.kind === "menu" ||
            Boolean(operationPanel && categoryStatus !== "success")
          }
          onRequestClose={close}
          onDismiss={restore}
        >
          <SafeAreaProvider>
            <SafeAreaView style={styles.root}>
              <ScrollView contentContainerStyle={styles.menu}>
                <Text accessibilityRole="header" style={styles.title}>
                  Ajouter · {panel ? longDate(panel.date) : ""}
                </Text>
                {panel?.kind === "menu" ? (
                  choices.map(([kind, label, help, icon]) => (
                    <Pressable
                      key={kind}
                      accessibilityRole="button"
                      accessibilityLabel={`${label} ${help}`}
                      onPress={() => {
                        if (kind === "expense" || kind === "income")
                          void loadCategories();
                        setError(null);
                        setPanel((p) => (p ? { ...p, kind } : p));
                      }}
                      style={styles.choice}
                    >
                      <Ionicons
                        name={icon}
                        color={colors.textPrimary}
                        size={24}
                      />
                      <View style={styles.choiceText}>
                        <Text style={styles.title}>{label}</Text>
                        <Text style={styles.text}>{help}</Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <FeedbackState
                    kind={categoryStatus === "error" ? "error" : "loading"}
                    title={
                      categoryStatus === "error"
                        ? "Catégories indisponibles"
                        : "Chargement des catégories"
                    }
                    description="Vos catégories personnelles sont nécessaires pour créer une opération."
                    actions={
                      categoryStatus === "error"
                        ? [
                            {
                              label: "Réessayer les catégories",
                              onPress: () => void loadCategories(),
                            },
                          ]
                        : []
                    }
                  />
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={styles.choice}
                >
                  <Text style={styles.text}>Annuler</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </SafeAreaProvider>
        </Modal>
        {operationPanel && categoryStatus === "success" && panel ? (
          <OperationFormModal
            key={`${panel.kind}:${panel.date}`}
            categories={categories}
            initialDate={panel.date}
            initialKind={panel.kind === "income" ? "ENTREE" : "DEPENSE"}
            errorMessage={error}
            isSaving={saving}
            operation={null}
            visible
            onCancel={close}
            onDelete={() => {}}
            onSave={(draft) => void save(draft)}
          />
        ) : null}
        {panel?.kind === "event" || panel?.kind === "potential" ? (
          <MonthlyEventFormModal
            key={`${panel.kind}:${panel.date}`}
            initialDate={panel.date}
            initialRecurrence="AUCUNE"
            errorMessage={error}
            event={null}
            potential={
              panel.kind === "potential"
                ? { minStartDate: potentialMinStartDate(currentParisMonth()) }
                : null
            }
            isSaving={saving}
            visible
            onCancel={close}
            onDelete={() => {}}
            onSave={(draft) => void save(draft)}
          />
        ) : null}
      </View>
    </QuickAddContext.Provider>
  );
};
const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0 },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.actionPrimaryBackground,
    elevation: 6,
  },
  menu: {
    padding: primitives.space["4"],
    gap: primitives.space["4"],
    maxWidth: 640,
    width: "100%",
    alignSelf: "center",
  },
  choice: {
    minHeight: 56,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
  },
  choiceText: { flex: 1, minWidth: 0 },
  title: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.lg,
    fontWeight: "600",
    flexShrink: 1,
  },
  text: {
    color: colors.textPrimary,
    fontSize: primitives.fontSize.md,
    flexShrink: 1,
  },
  feedback: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: colors.backgroundSurface,
    padding: 8,
    borderRadius: 12,
  },
  dismiss: { minHeight: 44, justifyContent: "center", padding: 8 },
});

import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { FeedbackState } from "@/src/design/FeedbackState";
import { RadioGroup } from "@/src/design/RadioGroup";
import { primitives, semantic, themes } from "@/src/design/tokens";
import type { ThemeTokens } from "@/src/design/tokens";
import { NativeChart } from "@/src/features/charts/NativeChart";
import {
  FinancialGoal,
  formatGoalMoney,
} from "@/src/features/goals/domain/financialGoal";
import {
  ASSUMPTION_KEYS,
  AssumptionKey,
  Assumptions,
  ProjectionKey,
  ZERO_ASSUMPTIONS,
  normalizedAssumption,
  reachText,
  trajectoryMonthLabel,
} from "@/src/features/goals/domain/savingsTrajectory";
import { SavingsTrajectoryGateway } from "@/src/features/goals/infrastructure/HttpSavingsTrajectoryGateway";
import {
  COMPARISONS,
  savingsComparisonOption,
} from "@/src/features/goals/presentation/savingsComparisonOption";
import { useSavingsTrajectory } from "@/src/features/goals/presentation/useSavingsTrajectory";

const semibold = `${primitives.fontWeight.semibold}` as "600";

const INPUTS: Record<AssumptionKey, [string, string]> = {
  currentRemainingVariableExpense: [
    "Complément variable restant ce mois-ci",
    "Uniquement ce qui reste à prévoir, en plus du réel et des événements déjà comptés.",
  ],
  futureAdditionalVariableExpense: [
    "Complément variable par mois futur",
    "Alimentation, loisirs, transports, achats… uniquement en plus des dépenses déjà prévues.",
  ],
  monthlySafetyMargin: [
    "Marge de sécurité mensuelle",
    "Somme laissée de côté chaque mois, non affectée aux objectifs ; ce n’est pas un seuil permanent.",
  ],
};
type Window = "12" | "24";
const WINDOWS: { value: Window; label: string }[] = [
  { value: "12", label: "12 mois · 11 versements futurs" },
  { value: "24", label: "24 mois · 23 versements futurs" },
];

interface Props {
  gateway: SavingsTrajectoryGateway;
  goal: FinancialGoal;
  onClose(): void;
  onRefreshGoals(): void;
}

/** Section repliable, état annoncé par `expanded`. */
const Disclosure = ({
  title,
  styles,
  children,
}: {
  title: string;
  styles: Styles;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.disclosureButton}
      >
        <Text style={styles.disclosureTitle}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={styles.disclosureTitle.color}
        />
      </Pressable>
      {open ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
};

/** Ligne « libellé : valeur », lue en un seul arrêt. */
const Fact = ({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: Styles;
}) => (
  <View
    accessible
    accessibilityLabel={`${label} : ${value}`}
    style={styles.fact}
  >
    <Text style={styles.factLabel}>{label}</Text>
    <Text style={styles.factValue}>{value}</Text>
  </View>
);

/**
 * « Simuler avec mon budget » (#285) : hypothèses réversibles comparées au
 * rythme prévu, comme le Web #284. Aucune écriture : ni opération, ni
 * objectif, ni virement. La jauge de la carte reste l'épargne déclarée.
 */
export const SavingsTrajectoryModal = ({
  gateway,
  goal,
  onClose,
  onRefreshGoals,
}: Props) => {
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [draft, setDraft] = useState<Assumptions>(ZERO_ASSUMPTIONS);
  const [assumptions, setAssumptions] = useState<Assumptions>(ZERO_ASSUMPTIONS);
  const [window, setWindow] = useState<Window>("24");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState<ProjectionKey[]>(
    COMPARISONS.map((item) => item.key),
  );
  const state = useSavingsTrajectory(
    gateway,
    goal,
    Number(window),
    assumptions,
  );
  const data = state.data;
  const option = useMemo(
    () => (data ? savingsComparisonOption(goal, data, colors, visible) : null),
    [colors, data, goal, visible],
  );
  const money = (value: string) => formatGoalMoney(value, goal.currency);
  const dirty = ASSUMPTION_KEYS.some(
    (key) => normalizedAssumption(draft[key]) !== assumptions[key],
  );

  // Résultat annoncé une fois calculé (l'écran ne bouge pas seul).
  useEffect(() => {
    if (state.status === "success") {
      AccessibilityInfo.announceForAccessibility("Comparaison recalculée.");
    }
  }, [state.status, data]);

  const apply = () => {
    const values = Object.fromEntries(
      ASSUMPTION_KEYS.map((key) => [key, normalizedAssumption(draft[key])]),
    ) as Record<AssumptionKey, string | null>;
    if (Object.values(values).some((value) => value === null)) {
      const message =
        "Saisissez des montants positifs ou nuls, avec deux décimales au maximum.";
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    setError("");
    setAssumptions(values as Assumptions);
  };
  const reset = () => {
    setDraft(ZERO_ASSUMPTIONS);
    setAssumptions(ZERO_ASSUMPTIONS);
    setError("");
  };

  const reasonable = data?.projections.reasonable;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaProvider>
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.flex}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>
                  Simuler avec mon budget
                </Text>
                <Pressable
                  accessibilityLabel="Fermer la simulation"
                  accessibilityRole="button"
                  onPress={onClose}
                  style={styles.iconButton}
                >
                  <Ionicons color={colors.textPrimary} name="close" size={28} />
                </Pressable>
              </View>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text accessibilityRole="header" style={styles.heading}>
                Que puis-je épargner avec mon budget ?
              </Text>
              <Text style={styles.help}>
                Le maximum théorique utilise le budget connu et les engagements.
                L’estimation raisonnable retire aussi vos compléments variables
                et votre marge. Ce sont des projections, sans modification de
                vos opérations ni de vos objectifs.
              </Text>

              {ASSUMPTION_KEYS.map((key) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.label}>
                    {INPUTS[key][0]} ({goal.currency})
                  </Text>
                  <TextInput
                    accessibilityLabel={`${INPUTS[key][0]} (${goal.currency})`}
                    accessibilityHint={INPUTS[key][1]}
                    keyboardType="decimal-pad"
                    maxLength={13}
                    onChangeText={(value) =>
                      setDraft((current) => ({ ...current, [key]: value }))
                    }
                    style={styles.input}
                    value={draft[key]}
                  />
                  <Text style={styles.help}>{INPUTS[key][1]}</Text>
                </View>
              ))}
              <Text style={styles.label}>Période, mois courant inclus</Text>
              <RadioGroup<Window>
                choices={WINDOWS}
                disabled={false}
                label="Période, mois courant inclus"
                value={window}
                onChange={setWindow}
              />
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={apply}
                  style={[styles.button, styles.primaryButton]}
                >
                  <Text style={styles.primaryLabel}>
                    Appliquer les hypothèses
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={reset}
                  style={[styles.button, styles.secondaryButton]}
                >
                  <Text style={styles.secondaryLabel}>
                    Réinitialiser les hypothèses
                  </Text>
                </Pressable>
              </View>
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.status, error !== "" && styles.error]}
              >
                {error ||
                  (dirty
                    ? "Modifications non appliquées : les résultats utilisent encore les dernières hypothèses calculées."
                    : "Hypothèses réversibles ; aucune épargne réelle n’est enregistrée.")}
              </Text>

              {state.status === "loading" ? (
                <FeedbackState
                  description="Calcul des trajectoires…"
                  kind="loading"
                  title="Comparaison en cours"
                />
              ) : null}
              {state.status === "error" || state.status === "conflict" ? (
                <FeedbackState
                  actions={[
                    state.status === "conflict"
                      ? {
                          label: "Actualiser les objectifs",
                          onPress: onRefreshGoals,
                        }
                      : {
                          label: "Réessayer la comparaison",
                          onPress: state.reload,
                        },
                  ]}
                  description={
                    state.status === "conflict"
                      ? "L’objectif a changé pendant la lecture. Actualisez les objectifs pour comparer un même état de vos données."
                      : "La comparaison est momentanément indisponible. Vos hypothèses et vos données restent inchangées."
                  }
                  kind="error"
                  title="Comparaison indisponible"
                />
              ) : null}

              {data && reasonable ? (
                <>
                  <Text style={styles.help}>
                    Référence :{" "}
                    {trajectoryMonthLabel(data.referenceDate.slice(0, 7))} ·{" "}
                    {data.scenario === "simulation"
                      ? "Simulation avec événements potentiels"
                      : "Budget habituel, événements confirmés"}
                    . Les capacités varient selon chaque mois.
                  </Text>
                  {COMPARISONS.map((item) => {
                    const projection = data.projections[item.key];
                    const first = projection.months[0];
                    return (
                      <View key={item.key} style={styles.card}>
                        <Text
                          accessibilityRole="header"
                          style={styles.cardTitle}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.reach}>
                          {reachText(projection)}
                        </Text>
                        {first ? (
                          <>
                            <Text style={styles.text}>
                              {money(first.selectedTotalContribution)} projetés
                              pour cet objectif en{" "}
                              {trajectoryMonthLabel(first.month)}
                            </Text>
                            <Fact
                              label="Capacité totale avant objectifs"
                              value={money(first.capacityBeforeGoals)}
                              styles={styles}
                            />
                            <Fact
                              label="Versement possible pour cet objectif"
                              value={money(first.selectedPossibleContribution)}
                              styles={styles}
                            />
                            <Fact
                              label="Supplément affecté"
                              value={money(first.allocatedSupplement)}
                              styles={styles}
                            />
                            {!first.fundable ? (
                              <Text style={[styles.text, styles.error]}>
                                Engagements ou marge non financés : déficit
                                conservé dans les reports.
                              </Text>
                            ) : null}
                          </>
                        ) : null}
                        {projection.scheduledReachMonth &&
                        projection.scheduledReachMonth !==
                          projection.estimatedReachMonth ? (
                          <Text style={styles.help}>
                            Rythme nominal :{" "}
                            {trajectoryMonthLabel(
                              projection.scheduledReachMonth,
                            )}
                            . Cette date seule ne garantit pas son financement.
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}

                  <Text style={styles.label}>Courbes affichées</Text>
                  {COMPARISONS.map((item) => {
                    const checked = visible.includes(item.key);
                    return (
                      <Pressable
                        key={item.key}
                        accessibilityRole="checkbox"
                        aria-checked={checked}
                        onPress={() =>
                          setVisible((old) =>
                            checked
                              ? old.filter((key) => key !== item.key)
                              : [...old, item.key],
                          )
                        }
                        style={styles.checkRow}
                      >
                        <Ionicons
                          color={item.color(colors)}
                          name={checked ? "checkbox" : "square-outline"}
                          size={24}
                        />
                        <Text style={styles.text}>
                          {item.label} · {item.pattern}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Text style={styles.help}>
                    Comparaison des trois trajectoires de {goal.title}. Les
                    dates et montants détaillés sont disponibles ci-dessous.
                  </Text>
                  {option && visible.length > 0 ? (
                    <NativeChart height={240} option={option} />
                  ) : null}
                  <Text style={styles.help}>
                    ● Départ : épargne déclarée. Courbes : projections futures.
                    ◇ Point non finançable avec le budget disponible. Repères :
                    cible, mois souhaité et dates d’atteinte finançables
                    présentes dans la période. Aucune donnée passée n’est
                    reconstituée.
                  </Text>

                  <Disclosure
                    title="Lire les trois trajectoires en tableau"
                    styles={styles}
                  >
                    <Text style={styles.help}>
                      Montants cumulés projetés en {goal.currency} ; non
                      finançable indiqué explicitement.
                    </Text>
                    {data.projections.planned.points.map((point, index) => (
                      <View
                        key={point.month}
                        accessible
                        accessibilityLabel={`${trajectoryMonthLabel(point.month)} : ${COMPARISONS.map(
                          (item) => {
                            const value =
                              data.projections[item.key].points[index];
                            return `${item.label} ${money(value.savedAmount)}${value.fundable ? "" : ", non finançable"}`;
                          },
                        ).join(" ; ")}`}
                        style={styles.row}
                      >
                        <Text style={styles.rowTitle}>
                          {trajectoryMonthLabel(point.month)}
                          {index === 0 ? " · déclaré" : " · projeté"}
                        </Text>
                        {COMPARISONS.map((item) => {
                          const value =
                            data.projections[item.key].points[index];
                          return (
                            <View key={item.key} style={styles.fact}>
                              <Text style={styles.factLabel}>{item.label}</Text>
                              <Text style={styles.factValue}>
                                {money(value.savedAmount)}
                                {value.fundable ? "" : " · non finançable"}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </Disclosure>

                  <Disclosure
                    title="Comprendre le mois courant et l’allocation"
                    styles={styles}
                  >
                    <Text style={styles.text}>
                      Le mois courant est partiellement écoulé. Le budget réel
                      et les événements prévus sont déjà pris en compte : seul
                      le complément restant saisi est ajouté aux dépenses.
                    </Text>
                    <Fact
                      label="Reste après réservations, avant hypothèses"
                      value={money(reasonable.current.serverRemaining)}
                      styles={styles}
                    />
                    <Fact
                      label="Réservé aux objectifs ce mois-ci"
                      value={money(reasonable.current.reservedContributions)}
                      styles={styles}
                    />
                    <Fact
                      label="Reste après complément et marge"
                      value={money(
                        reasonable.current.remainingUnderAssumptions,
                      )}
                      styles={styles}
                    />
                    <Text style={styles.text}>
                      Ce reste n’augmente pas la jauge. Le solde courant positif
                      est protégé car il pourrait déjà contenir l’épargne
                      déclarée. Les reports négatifs doivent être couverts avant
                      d’affecter un supplément. La marge est conservée chaque
                      mois.
                    </Text>
                    <Text style={styles.text}>
                      Les versements des autres objectifs sont maintenus. Seul «{" "}
                      {goal.title} » reçoit le supplément. Aucune somme n’est
                      affectée plusieurs fois ni automatiquement réaffectée
                      après atteinte.
                    </Text>
                    {reasonable.months[0]?.allocations.map((allocation) => (
                      <Text key={allocation.goalId} style={styles.text}>
                        •{" "}
                        {
                          data.goals.find(
                            (item) => item.id === allocation.goalId,
                          )?.title
                        }{" "}
                        : {money(allocation.reservedContribution)} réservés,{" "}
                        {money(allocation.projectedContribution)} projetés au
                        premier mois futur.
                      </Text>
                    ))}
                  </Disclosure>
                </>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (colors: ThemeTokens["color"]) =>
  StyleSheet.create({
    flex: { backgroundColor: colors.backgroundCanvas, flex: 1 },
    content: {
      alignSelf: "center",
      gap: primitives.space["3"],
      maxWidth: primitives.size.contentSm,
      padding: primitives.space["6"],
      paddingBottom: primitives.space["16"],
      width: "100%",
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: primitives.fontSize["2xl"],
      fontWeight: semibold,
    },
    iconButton: {
      alignItems: "center",
      height: primitives.size.controlMd,
      justifyContent: "center",
      width: primitives.size.controlMd,
    },
    goalTitle: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    heading: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.lg,
      fontWeight: semibold,
      marginTop: primitives.space["2"],
    },
    field: { gap: primitives.space["1"] },
    label: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
      marginTop: primitives.space["2"],
    },
    input: {
      backgroundColor: colors.fieldBackground,
      borderColor: colors.fieldBorder,
      borderRadius: semantic.radius.control,
      borderWidth: semantic.borderWidth.default,
      color: colors.fieldText,
      fontSize: primitives.fontSize.md,
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    help: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    text: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    status: {
      color: colors.textSecondary,
      fontSize: primitives.fontSize.sm,
      lineHeight: 20,
    },
    error: { color: colors.statusErrorText, fontWeight: semibold },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      marginTop: primitives.space["2"],
    },
    button: {
      alignItems: "center",
      borderRadius: semantic.radius.control,
      justifyContent: "center",
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: semantic.space.controlInline,
    },
    primaryButton: { backgroundColor: colors.actionPrimaryBackground },
    secondaryButton: { backgroundColor: colors.actionSecondaryBackground },
    primaryLabel: {
      color: colors.actionPrimaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    secondaryLabel: {
      color: colors.actionSecondaryText,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    card: {
      backgroundColor: colors.backgroundSurface,
      borderColor: colors.borderSubtle,
      borderRadius: semantic.radius.card,
      borderWidth: semantic.borderWidth.default,
      gap: primitives.space["2"],
      padding: primitives.space["4"],
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    reach: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.lg,
      fontWeight: semibold,
    },
    fact: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: primitives.space["2"],
      justifyContent: "space-between",
    },
    factLabel: {
      color: colors.textSecondary,
      flexShrink: 1,
      fontSize: primitives.fontSize.sm,
    },
    factValue: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
    },
    checkRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: primitives.space["2"],
      minHeight: semantic.size.controlMinHeight,
    },
    disclosure: {
      borderColor: colors.borderSubtle,
      borderRadius: semantic.radius.card,
      borderWidth: semantic.borderWidth.default,
      overflow: "hidden",
    },
    disclosureButton: {
      alignItems: "center",
      flexDirection: "row",
      gap: primitives.space["2"],
      justifyContent: "space-between",
      minHeight: semantic.size.controlMinHeight,
      paddingHorizontal: primitives.space["4"],
    },
    disclosureTitle: {
      color: colors.textPrimary,
      flexShrink: 1,
      fontSize: primitives.fontSize.md,
      fontWeight: semibold,
    },
    disclosureBody: {
      gap: primitives.space["2"],
      padding: primitives.space["4"],
      paddingTop: 0,
    },
    row: {
      borderTopColor: colors.borderSubtle,
      borderTopWidth: semantic.borderWidth.default,
      gap: primitives.space["1"],
      paddingTop: primitives.space["2"],
    },
    rowTitle: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.sm,
      fontWeight: semibold,
    },
  });

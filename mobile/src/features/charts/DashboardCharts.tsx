import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { FeedbackState } from "@/src/design/FeedbackState";
import { primitives, semantic, themes } from "@/src/design/tokens";
import { CategoryMark } from "@/src/features/categories/presentation/CategoryMark";
import { ChartGateway } from "./ChartGateway";
import { NativeChart } from "./NativeChart";
import { categoryColor, expensesOption, goalsOption } from "./chartOptions";
import { SectionState, sectionLoading, sectionView } from "./sectionState";

function useSection<T>(load: () => Promise<T>) {
  const [state, setState] = useState<SectionState<T>>({ status: "loading" });
  const latest = useRef(0);
  const retry = useCallback(async () => {
    const request = ++latest.current;
    // Le graphique déjà affiché reste visible pendant le rechargement (#154).
    setState(sectionLoading);
    try {
      const data = await load();
      if (request === latest.current) setState({ status: "success", data });
    } catch {
      if (request === latest.current)
        setState((current) => ({ ...current, status: "error" }));
    }
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void retry();
      return () => {
        latest.current++;
      };
    }, [retry]),
  );
  return { ...state, retry };
}
export const DashboardCharts = ({ gateway }: { gateway: ChartGateway }) => {
  // L'application mobile est entièrement en thème clair : suivre le mode
  // sombre du système ici rendait ces seules cartes sombres sur fond clair.
  const colors = themes.light.color;
  const loadExpenses = useCallback(() => gateway.expenses(), [gateway]);
  const loadGoals = useCallback(() => gateway.goals(), [gateway]);
  const expenses = useSection(loadExpenses);
  const goals = useSection(loadGoals);
  const expenseOption = useMemo(
    () => expensesOption(expenses.data ?? [], colors),
    [expenses.data, colors],
  );
  const goalOption = useMemo(
    () => goalsOption(goals.data?.percent ?? 0, colors),
    [goals.data, colors],
  );
  return (
    <View style={{ gap: primitives.space["4"] }}>
      {[
        {
          title: "Dépenses du mois par catégorie",
          testID: "expenses-chart-card",
          loading: "Les dépenses du mois arrivent.",
          view: sectionView(expenses, (rows) => rows.length === 0),
          retry: expenses.retry,
          emptyTitle: "Aucune dépense ce mois-ci",
          emptyDescription:
            "Vos dépenses du mois apparaîtront ici par catégorie.",
          labels:
            expenses.data?.map((r) => ({
              text: r.label,
              // Icône ou pastille dans la couleur de la barre (#132, #172).
              mark: { icon: r.icon, color: categoryColor(r, colors) },
            })) ?? [],
          option: expenseOption,
          height: Math.max(160, (expenses.data?.length ?? 0) * 40 + 48),
        },
        {
          title: "Atteinte des objectifs",
          testID: "goals-chart-card",
          loading: "Vos objectifs d’épargne arrivent.",
          view: sectionView(goals, (data) => data.labels.length === 0),
          retry: goals.retry,
          emptyTitle: "Aucun objectif en euros",
          emptyDescription: "Créez un objectif pour suivre votre épargne ici.",
          labels: [
            `${goals.data?.percent ?? 0} % de l’épargne visée atteinte`,
            ...(goals.data?.labels ?? []),
          ].map((text) => ({ text, mark: null })),
          option: goalOption,
          height: 200,
        },
      ].map(
        ({
          title,
          testID,
          loading,
          view,
          retry,
          emptyTitle,
          emptyDescription,
          labels,
          option,
          height,
        }) => (
          <View
            key={title}
            testID={testID}
            style={{
              backgroundColor: colors.backgroundSurface,
              borderColor: colors.borderSubtle,
              borderWidth: semantic.borderWidth.default,
              borderRadius: semantic.radius.card,
              padding: primitives.space["4"],
              gap: primitives.space["2"],
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: colors.textPrimary,
                fontSize: primitives.fontSize.lg,
                fontWeight: `${primitives.fontWeight.semibold}` as "600",
              }}
            >
              {title}
            </Text>
            {view === "loading" ? (
              <FeedbackState
                description={loading}
                framed={false}
                kind="loading"
                title="Chargement du graphique"
              />
            ) : view === "error" ? (
              <FeedbackState
                actions={[
                  {
                    accessibilityLabel: `Réessayer : ${title}`,
                    label: "Réessayer",
                    onPress: () => void retry(),
                  },
                ]}
                description="Vérifiez votre connexion puis réessayez."
                framed={false}
                kind="error"
                title="Graphique indisponible"
              />
            ) : view === "empty" ? (
              <FeedbackState
                description={emptyDescription}
                framed={false}
                kind="empty"
                title={emptyTitle}
              />
            ) : (
              <>
                <NativeChart option={option} height={height} />
                {labels.map(({ text, mark }, index) =>
                  mark ? (
                    <View
                      key={index}
                      style={{
                        alignItems: "center",
                        flexDirection: "row",
                        gap: primitives.space["2"],
                      }}
                    >
                      <CategoryMark category={mark} size={18} />
                      <Text style={{ color: colors.textPrimary }}>{text}</Text>
                    </View>
                  ) : (
                    <Text key={index} style={{ color: colors.textPrimary }}>
                      {text}
                    </Text>
                  ),
                )}
              </>
            )}
          </View>
        ),
      )}
    </View>
  );
};

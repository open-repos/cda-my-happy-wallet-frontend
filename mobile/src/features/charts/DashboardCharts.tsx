import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { semantic, themes } from "@/src/design/tokens";
import { fontAwesomeIcon } from "@/src/features/categories/domain/categoryIcons";
import { CategoryMark } from "@/src/features/categories/presentation/CategoryMark";
import { ChartGateway } from "./ChartGateway";
import { NativeChart } from "./NativeChart";
import { expensesOption, goalsOption } from "./chartOptions";

function useSection<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{
    status: "loading" | "error" | "success";
    data?: T;
  }>({ status: "loading" });
  const latest = useRef(0);
  const retry = useCallback(async () => {
    const request = ++latest.current;
    setState({ status: "loading" });
    try {
      const data = await load();
      if (request === latest.current) setState({ status: "success", data });
    } catch {
      if (request === latest.current) setState({ status: "error" });
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
    <View style={{ gap: 16 }}>
      {[
        {
          title: "Dépenses du mois par catégorie",
          section: expenses,
          empty: !expenses.data?.length,
          labels:
            expenses.data?.map((r) => ({
              text: r.label,
              // Icône de la catégorie devant son montant (#132).
              mark: fontAwesomeIcon(r.icon)
                ? { icon: r.icon, color: r.color }
                : null,
            })) ?? [],
          option: expenseOption,
          height: Math.max(160, (expenses.data?.length ?? 0) * 40 + 48),
        },
        {
          title: "Atteinte des objectifs",
          section: goals,
          empty: !goals.data?.labels.length,
          labels: [
            `${goals.data?.percent ?? 0} % de l’épargne visée atteinte`,
            ...(goals.data?.labels ?? []),
          ].map((text) => ({ text, mark: null })),
          option: goalOption,
          height: 200,
        },
      ].map(({ title, section, empty, labels, option, height }) => (
        <View
          key={title}
          testID={
            title === "Atteinte des objectifs"
              ? "goals-chart-card"
              : "expenses-chart-card"
          }
          style={{
            backgroundColor: colors.backgroundSurface,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: semantic.radius.card,
            padding: 16,
            gap: 8,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              color: colors.textPrimary,
              fontSize: 20,
              fontWeight: "600",
            }}
          >
            {title}
          </Text>
          {section.status === "loading" ? (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.textPrimary }}
            >
              Chargement…
            </Text>
          ) : section.status === "error" ? (
            <>
              <Text
                accessibilityRole="alert"
                style={{ color: colors.textPrimary }}
              >
                Graphique indisponible. Vérifiez votre connexion.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Réessayer : ${title}`}
                onPress={() => void section.retry()}
                style={{ minHeight: 48, justifyContent: "center" }}
              >
                <Text style={{ color: colors.textPrimary }}>Réessayer</Text>
              </Pressable>
            </>
          ) : empty ? (
            <Text style={{ color: colors.textPrimary }}>
              Aucune donnée à afficher.
            </Text>
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
                      gap: 8,
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
      ))}
    </View>
  );
};

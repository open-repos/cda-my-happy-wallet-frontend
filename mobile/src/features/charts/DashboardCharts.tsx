import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, useColorScheme, View } from "react-native";
import { semantic, themes } from "@/src/design/tokens";
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
  const colors = themes[useColorScheme() === "dark" ? "dark" : "light"].color;
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
          labels: expenses.data?.map((r) => r.label) ?? [],
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
          ],
          option: goalOption,
          height: 200,
        },
      ].map(({ title, section, empty, labels, option, height }) => (
        <View
          key={title}
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
              {labels.map((label, index) => (
                <Text key={index} style={{ color: colors.textPrimary }}>
                  {label}
                </Text>
              ))}
            </>
          )}
        </View>
      ))}
    </View>
  );
};

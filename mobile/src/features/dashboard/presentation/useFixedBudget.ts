import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  BudgetSummary,
  summarizeFixedBudget,
} from "@/src/features/dashboard/domain/fixedBudget";
import { FixedBudgetGateway } from "@/src/features/dashboard/infrastructure/HttpFixedBudgetGateway";

type LoadStatus = "loading" | "success" | "error";
const emptySummary: BudgetSummary = { expenses: 0, income: 0, remaining: 0 };

export const useFixedBudget = (gateway: FixedBudgetGateway) => {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [summary, setSummary] = useState<BudgetSummary>(emptySummary);
  const [operationCount, setOperationCount] = useState(0);

  const applyOperations = useCallback(
    (operations: Awaited<ReturnType<FixedBudgetGateway["listAll"]>>) => {
      setSummary(summarizeFixedBudget(operations));
      setOperationCount(operations.length);
      setStatus("success");
    },
    [],
  );
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      applyOperations(await gateway.listAll());
    } catch {
      setStatus("error");
    }
  }, [applyOperations, gateway]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      void gateway
        .listAll()
        .then((operations) => {
          if (isActive) applyOperations(operations);
        })
        .catch(() => {
          if (isActive) setStatus("error");
        });
      return () => {
        isActive = false;
      };
    }, [applyOperations, gateway]),
  );

  return { operationCount, retry: load, status, summary };
};

import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import { describe, expect, it } from "vitest";

import { themes } from "@/src/design/tokens";
import { parseFinancialGoal } from "@/src/features/goals/domain/financialGoal";
import { parseSavingsTrajectories } from "@/src/features/goals/domain/savingsTrajectory";

import { savingsComparisonOption } from "./savingsComparisonOption";

const fixtures = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL(
        "../../../../../test/fixtures/savingsTrajectories.json",
        import.meta.url,
      ),
    ),
    "utf8",
  ),
);
const goal = parseFinancialGoal(fixtures.goals[0]);
const data = parseSavingsTrajectories(
  fixtures.cases["standard-24-1-true"],
  {
    currency: "EUR",
    scenario: "standard",
    months: 24,
    selectedGoalId: 1,
    currentRemainingVariableExpense: "100.00",
    futureAdditionalVariableExpense: "700.00",
    monthlySafetyMargin: "100.00",
  },
  goal,
);

describe("savings comparison chart (#285)", () => {
  it("draws the server points of each visible curve without animation", () => {
    const option = savingsComparisonOption(goal, data, themes.light.color, [
      "planned",
      "reasonable",
    ]);
    expect(option.animation).toBe(false);
    expect(option.yAxis.splitLine.show).toBe(false);
    expect(option.series.map((s) => s.name)).toEqual([
      "Rythme prévu",
      "Estimation raisonnable",
    ]);
    expect(option.series[1].data.map((p) => p.value)).toEqual(
      data.projections.reasonable.points.map((p) => Number(p.savedAmount)),
    );
    expect(option.series[1].lineStyle).toMatchObject({
      type: "solid",
      cap: "round",
    });
  });

  it("marks the target, the desired month and the fundable reach month", () => {
    const option = savingsComparisonOption(goal, data, themes.dark.color, [
      "maximum",
    ]);
    expect(option.series[0].markLine.data).toEqual([
      { yAxis: 6000 },
      { xAxis: "2027-05" },
      { xAxis: "2027-01" },
    ]);
  });
});

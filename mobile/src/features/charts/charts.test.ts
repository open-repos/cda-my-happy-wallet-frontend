import { describe, expect, it, vi } from "vitest";
import { expenseRows, goalProgress, parseGoal } from "./chartData";
import { allPages, ChartGateway } from "./ChartGateway";
import { expensesOption, goalsOption } from "./chartOptions";
import { themes } from "@/src/design/tokens";
import * as echarts from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

echarts.use([BarChart, PieChart, GridComponent, SVGRenderer]);
const goal = {
  id: 1,
  title: "Voyage",
  currency: "EUR",
  savedAmount: "99.99",
  targetAmount: "100.00",
};
describe("mobile dashboard charts", () => {
  it("counts cents, excludes income and foreign currencies, sorts and provides French text", () => {
    const base = {
      id: 1,
      title: "Course",
      operationDate: "2026-10-01",
      categoryId: 1,
      currency: "EUR",
      type: "DEPENSE" as const,
    };
    const rows = expenseRows(
      [
        { ...base, amount: "0.10" },
        { ...base, amount: "0.20" },
        { ...base, amount: "99.00", type: "ENTREE" },
        { ...base, amount: "99.00", currency: "USD" },
        { ...base, categoryId: 2, amount: "1.00" },
      ],
      [{ id: 1, name: "Courses", color: null }],
    );
    expect(rows.map((r) => r.cents)).toEqual([100, 30]);
    expect(rows[1].label).toContain("Courses : 0,30");
    expect(rows[0].name).toBe("Autre catégorie");
  });
  it("caps EACH goal before aggregation and floors the percentage like Web", () => {
    expect(goalProgress([goal]).percent).toBe(99);
    expect(
      goalProgress([
        { ...goal, savedAmount: "200.00" },
        { ...goal, id: 2, savedAmount: "0.00" },
      ]).percent,
    ).toBe(50);
    expect(goalProgress([{ ...goal, currency: "USD" }])).toEqual({
      percent: 0,
      labels: [],
    });
    expect(goalProgress([{ ...goal, targetAmount: "0.00" }]).percent).toBe(0);
    expect(goalProgress([goal]).labels[0]).toContain("Voyage : 99,99");
    expect(parseGoal(goal)).toEqual(goal);
    expect(() => parseGoal({ ...goal, savedAmount: "NaN" })).toThrow();
  });
  it("rejects truncated or cyclic pagination", async () => {
    await expect(
      allPages(async () => ({
        data: [],
        meta: { hasNext: true, nextCursor: null },
      })),
    ).rejects.toThrow();
    await expect(
      allPages(async () => ({
        data: [],
        meta: { hasNext: true, nextCursor: "again" },
      })),
    ).rejects.toThrow();
  });
  it("loads every goals page through the authorized client and rejects errors", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [goal],
          meta: { limit: 100, hasNext: true, nextCursor: "next" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ ...goal, id: 2 }],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        }),
      );
    expect((await new ChartGateway({ request }).goals()).percent).toBe(99);
    expect(request.mock.calls.map((c) => c[0])).toEqual([
      "/goals?limit=100",
      "/goals?limit=100&cursor=next",
    ]);
    await expect(
      new ChartGateway({
        request: async () => new Response(null, { status: 503 }),
      }).goals(),
    ).rejects.toThrow();
  });
  it("uses the current Paris month and every operation page", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T23:30:00Z"));
    try {
      const paths: string[] = [];
      const request = async (path: string) => {
        paths.push(path);
        return Response.json({
          data: [],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        });
      };
      expect(await new ChartGateway({ request }).expenses()).toEqual([]);
      expect(paths).toContain(
        "/operations?limit=20&from=2026-11-01&to=2026-11-30&currency=EUR",
      );
    } finally {
      vi.useRealTimers();
    }
  });
  for (const theme of ["light", "dark"] as const)
    it(`renders valid ${theme} SVG options without generated aria or animation`, () => {
      for (const option of [
        expensesOption(
          [{ name: "Courses", cents: 30, label: "Courses : 0,30 €" }],
          themes[theme].color,
        ),
        goalsOption(99, themes[theme].color),
      ]) {
        expect(option.aria).toEqual({ enabled: false });
        expect(option.animation).toBe(false);
        const chart = echarts.init(null, undefined, {
          renderer: "svg",
          ssr: true,
          width: 320,
          height: 240,
        });
        try {
          chart.setOption(option);
          expect(chart.renderToSVGString()).toContain("<path");
        } finally {
          chart.dispose();
        }
      }
    });
});

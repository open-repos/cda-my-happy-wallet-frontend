import { describe, expect, it, vi } from "vitest";
import { expenseRows, goalProgress, parseGoal } from "./chartData";
import { allPages, ChartGateway } from "./ChartGateway";
import {
  axisLabelText,
  categoryColor,
  CATEGORY_PALETTE,
  expensesOption,
  goalsOption,
} from "./chartOptions";
import { themes } from "@/src/design/tokens";
import { CATEGORY_PALETTE as PICKER_COLORS } from "@/src/features/categories/domain/categoryDraft";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
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
/** Rendu SVG hors écran ; échoue si ECharts signale une option obsolète. */
const renderSvg = (option: EChartsCoreOption) => {
  const logs = (["log", "warn", "error"] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
  const chart = echarts.init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 320,
    height: 240,
  });
  try {
    chart.setOption(option);
    const svg = chart.renderToSVGString();
    for (const spy of logs) expect(spy).not.toHaveBeenCalled();
    return svg;
  } finally {
    chart.dispose();
    for (const spy of logs) spy.mockRestore();
  }
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
      [
        {
          id: 1,
          name: "Courses",
          color: "#275DAD",
          icon: "solid:cart-shopping",
        },
      ],
    );
    expect(rows.map((r) => r.cents)).toEqual([100, 30]);
    // Icône et couleur de la catégorie, pour la liste sous le graphique.
    expect(rows[1]).toMatchObject({
      icon: "solid:cart-shopping",
      color: "#275DAD",
    });
    expect(rows[0]).toMatchObject({ icon: null, color: null });
    expect(rows[1].label).toContain("Courses : 0,30");
    expect(rows[0].name).toBe("Autre catégorie");
  });
  it("breaks equal totals by category id like Web", () => {
    const base = {
      id: 1,
      title: "Course",
      operationDate: "2026-10-01",
      currency: "EUR",
      type: "DEPENSE" as const,
      amount: "5.00",
    };
    const rows = expenseRows(
      [
        { ...base, categoryId: 3 },
        { ...base, categoryId: 2 },
      ],
      [],
    );
    expect(rows.map((r) => r.categoryId)).toEqual([2, 3]);
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
  it("ranks categories by id for a stable palette color (#172)", () => {
    const base = {
      id: 1,
      title: "Achat",
      operationDate: "2026-10-01",
      currency: "EUR",
      type: "DEPENSE" as const,
    };
    const categories = [
      { id: 9, name: "Transport", color: null, icon: "solid:bus" },
      { id: 3, name: "Autres", color: null },
      { id: 5, name: "Loisir", color: "#123456" },
    ];
    const rows = (amounts: Record<number, string>) =>
      expenseRows(
        Object.entries(amounts).map(([categoryId, amount]) => ({
          ...base,
          categoryId: Number(categoryId),
          amount,
        })),
        categories,
      );
    const indexOf = (list: ReturnType<typeof rows>) =>
      Object.fromEntries(list.map((r) => [r.categoryId, r.paletteIndex]));
    const first = rows({ 9: "350.00", 3: "10.00", 5: "1.00", 42: "2.00" });
    // Rang par identifiant parmi les catégories sans couleur (3, 9) ; les
    // autres, inutilisées ou inconnues, viennent après.
    expect(indexOf(first)).toEqual({ 3: 0, 9: 1, 5: 2, 42: 2 });
    // Le rang ne dépend ni des montants ni du tri.
    expect(indexOf(rows({ 9: "1.00", 3: "500.00", 5: "9.00" }))).toEqual({
      3: 0,
      9: 1,
      5: 2,
    });
  });
  it("uses the category color, else the theme palette, wrapping around", () => {
    for (const theme of ["light", "dark"] as const) {
      const colors = themes[theme].color;
      const palette = CATEGORY_PALETTE.map((role) => colors[role]);
      expect(new Set(palette).size).toBe(6);
      expect(categoryColor({ color: "#123456", paletteIndex: 0 }, colors)).toBe(
        "#123456",
      );
      expect(categoryColor({ color: null, paletteIndex: 2 }, colors)).toBe(
        palette[2],
      );
      expect(categoryColor({ color: null, paletteIndex: 6 }, colors)).toBe(
        palette[0],
      );
    }
  });
  it("never reuses a color offered by the category picker", () => {
    // Sinon une catégorie sans couleur ressemble à une catégorie colorée :
    // « Autres » prenait le bleu de « Transport » (#172).
    const picker = new Set(PICKER_COLORS.map((c) => c.value.toLowerCase()));
    for (const theme of ["light", "dark"] as const)
      for (const role of CATEGORY_PALETTE)
        expect(picker.has(themes[theme].color[role].toLowerCase())).toBe(false);
  });
  it("draws each bar in its category color and fits the label column (#154, #172)", () => {
    const colors = themes.light.color;
    const rows = [
      { categoryId: 9, paletteIndex: 2, color: null, name: "Transport" },
      { categoryId: 3, paletteIndex: 0, color: null, name: "Autres" },
      { categoryId: 5, paletteIndex: 1, color: "#123456", name: "Loisir" },
    ].map((row) => ({ ...row, cents: 100, icon: null, label: row.name }));
    const raw = expensesOption(rows, colors);
    const option = raw as unknown as {
      grid: Record<string, unknown>;
      yAxis: { axisLabel: Record<string, unknown> };
      series: { data: { itemStyle: { color: string } }[] }[];
    };
    expect(option.series[0].data.map((d) => d.itemStyle.color)).toEqual([
      colors.dataCategory3,
      colors.dataCategory1,
      "#123456",
    ]);
    // `containLabel` est remplacé par les bornes extérieures d'ECharts 6.
    expect(option.grid).not.toHaveProperty("containLabel");
    expect(option.grid).toMatchObject({
      outerBoundsMode: "same",
      outerBoundsContain: "axisLabel",
    });
    // Pas de largeur fixe : la colonne suit le libellé le plus long.
    expect(option.yAxis.axisLabel).not.toHaveProperty("width");
    expect(option.yAxis.axisLabel.formatter).toBe(axisLabelText);
    const svg = renderSvg(raw).toLowerCase();
    for (const color of [colors.dataCategory3, colors.dataCategory1, "#123456"])
      expect(svg).toContain(`fill="${color.toLowerCase()}"`);
  });
  it("truncates long category names on the axis only", () => {
    expect(axisLabelText("Autres")).toBe("Autres");
    const long = axisLabelText("Abonnements et services numériques");
    // 16 caractères au plus, sans espace devant les points de suspension.
    expect(long).toBe("Abonnements et…");
  });
  for (const theme of ["light", "dark"] as const)
    it(`renders valid ${theme} SVG options without generated aria or animation`, () => {
      for (const option of [
        expensesOption(
          [
            {
              categoryId: 1,
              name: "Courses",
              cents: 30,
              icon: null,
              color: null,
              paletteIndex: 0,
              label: "Courses : 0,30 €",
            },
          ],
          themes[theme].color,
        ),
        goalsOption(99, themes[theme].color),
      ]) {
        expect(option.aria).toEqual({ enabled: false });
        expect(option.animation).toBe(false);
        expect(renderSvg(option)).toContain("<path");
      }
    });
});

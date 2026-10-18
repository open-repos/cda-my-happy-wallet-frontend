import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Analyses from "../../src/js/pages/Analyses";
import { useAnalytics } from "../../src/js/hooks/useAnalytics";
import { categoryService } from "../../src/js/services/categoryService";

vi.mock("../../src/js/hooks/useAnalytics", () => ({ useAnalytics: vi.fn() }));
vi.mock("../../src/js/services/categoryService", () => ({
  categoryService: { listAll: vi.fn() },
}));
// Palette connue, sans dépendre des variables CSS de jsdom.
vi.mock("../../src/js/components/charts/useChartTokens", () => ({
  useChartTokens: () => ({
    text: "#111111",
    muted: "#555555",
    grid: "#dddddd",
    expense: "#cc3300",
    income: "#228844",
    surface: "#ffffff",
    categories: ["#a10001", "#a10002", "#a10003"],
    reducedMotion: true,
  }),
}));
// Chaque tracé est enregistré avec ses couleurs de secteur.
const drawn = [];
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ option }) => {
    drawn.push(option.series[0].data.map((item) => item.itemStyle?.color));
    return <div role="img" />;
  },
}));

const analytics = (status) => ({
  status,
  reload: vi.fn(),
  data:
    status === "success"
      ? {
          currency: "EUR",
          from: "2026-10-01",
          to: "2026-10-31",
          groupBy: "category",
          splitBy: null,
          kind: "DEPENSE",
          buckets: [
            {
              key: "7",
              label: "Loisirs",
              color: null,
              income: "0.00",
              expense: "18.00",
              net: "-18.00",
              count: 1,
            },
          ],
        }
      : null,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  drawn.length = 0;
});

describe("Analyses category colours (#172)", () => {
  it("draws with the home ranks only, and keeps them across filter changes", async () => {
    // « Alimentation » (1) et « Loisirs » (7) sans couleur : Loisirs est au
    // rang 1, comme sur l'accueil, même si elle seule a des dépenses.
    let resolve;
    categoryService.listAll.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    useAnalytics.mockReturnValue(analytics("success"));
    render(
      <MemoryRouter
        initialEntries={[
          "/analyses?metric=expense&groupBy=category&splitBy=none&chart=pie&period=month",
        ]}
      >
        <Analyses />
      </MemoryRouter>
    );
    // Pas de tracé avant les rangs : la couleur ne changerait qu'après coup.
    expect(screen.getByText("Chargement du graphique…")).toBeTruthy();
    expect(drawn).toEqual([]);
    resolve([
      { id: 1, name: "Alimentation", color: null },
      { id: 7, name: "Loisirs", color: null },
    ]);
    await waitFor(() => expect(drawn.length).toBeGreaterThan(0));

    // Un changement de filtre recharge les analyses, pas les catégories.
    useAnalytics.mockReturnValue(analytics("loading"));
    fireEvent.change(screen.getByLabelText("Période"), {
      target: { value: "3m" },
    });
    useAnalytics.mockReturnValue(analytics("success"));
    fireEvent.change(screen.getByLabelText("Période"), {
      target: { value: "month" },
    });

    expect(categoryService.listAll).toHaveBeenCalledTimes(1);
    expect(new Set(drawn.flat())).toEqual(new Set(["#a10002"]));
  });
});

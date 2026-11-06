import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import Objectifs from "../../src/js/pages/Objectifs";
import { budgetForecastService } from "../../src/js/services/budgetForecastService";
import { goalsService } from "../../src/js/services/goalsService";
import { monthlyEventsService } from "../../src/js/services/monthlyEventsService";
import { savingsCapacityService } from "../../src/js/services/savingsCapacityService";
import { budgetForecast } from "./fixtures/budgetForecast";
import { savingsOverview } from "./fixtures/savingsCapacity";

vi.mock("../../src/js/services/monthlyEventsService", () => ({
  monthlyEventsService: {
    listEvents: vi.fn(),
    listOccurrences: vi.fn(),
    listPotentialEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));
vi.mock("../../src/js/services/goalsService", async (importOriginal) => ({
  ...(await importOriginal()),
  goalsService: {
    listAllGoals: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));
vi.mock("../../src/js/services/savingsCapacityService", () => ({
  savingsCapacityService: { overview: vi.fn() },
}));
vi.mock(
  "../../src/js/services/budgetForecastService",
  async (importOriginal) => ({
    ...(await importOriginal()),
    budgetForecastService: { forecast: vi.fn() },
  })
);

/**
 * Page Objectifs complète, vrais hooks et vrai SimulationProvider (#171) :
 * chaque texte écrit dans une région `status` est enregistré, pour vérifier
 * qu'une actualisation n'annonce aucun chargement.
 */
const recordStatusTexts = () => {
  const texts = [];
  const observer = new MutationObserver(() => {
    for (const region of screen.queryAllByRole("status"))
      if (region.textContent) texts.push(region.textContent);
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  return { texts, stop: () => observer.disconnect() };
};
const LOADING = /Chargement|Calcul/;

const renderPage = () =>
  render(
    <MemoryRouter>
      <SimulationProvider>
        <Objectifs />
      </SimulationProvider>
    </MemoryRouter>
  );
const settled = () =>
  waitFor(() => {
    expect(screen.getByText("Tenable")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Aucun événement prévu" })
    ).toBeInTheDocument();
  });

beforeEach(() => {
  vi.resetAllMocks();
  monthlyEventsService.listEvents.mockResolvedValue([]);
  monthlyEventsService.listOccurrences.mockResolvedValue([]);
  monthlyEventsService.listPotentialEvents.mockResolvedValue([]);
  monthlyEventsService.createEvent.mockResolvedValue({ id: 1 });
  goalsService.listAllGoals.mockResolvedValue([]);
  savingsCapacityService.overview.mockResolvedValue(savingsOverview());
  budgetForecastService.forecast.mockResolvedValue(budgetForecast());
});
afterEach(cleanup);

describe("Objectifs refresh announcements (#171)", () => {
  it("announces the first loading of every section", async () => {
    // Réponses retenues : le chargement dure plus d'un tick.
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const later = (value) => gate.then(() => value);
    monthlyEventsService.listEvents.mockReturnValue(later([]));
    goalsService.listAllGoals.mockReturnValue(later([]));
    savingsCapacityService.overview.mockReturnValue(later(savingsOverview()));

    const record = recordStatusTexts();
    renderPage();
    const expected = [
      "Chargement des événements…",
      "Chargement des objectifs…",
      "Chargement de la capacité d’épargne…",
    ];
    await waitFor(() =>
      expect(record.texts).toEqual(expect.arrayContaining(expected))
    );
    await act(async () => release());
    await settled();
    record.stop();
  });

  it("announces no loading when invalidate() refreshes every section", async () => {
    renderPage();
    await settled();
    const calls = savingsCapacityService.overview.mock.calls.length;

    const record = recordStatusTexts();
    // Retour sur l'onglet : SimulationProvider appelle invalidate().
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(savingsCapacityService.overview.mock.calls.length).toBeGreaterThan(
        calls
      )
    );
    await settled();
    await new Promise((resolve) => setTimeout(resolve, 20));
    record.stop();
    expect(record.texts.filter((text) => LOADING.test(text))).toEqual([]);
  });

  it("announces the simulation gap once, not on its refresh", async () => {
    renderPage();
    await settled();
    const record = recordStatusTexts();
    fireEvent.click(screen.getByRole("switch", { name: "Simulation" }));
    await waitFor(() =>
      expect(screen.getByText(/Avec la Simulation/)).toBeInTheDocument()
    );
    await settled();
    expect(record.texts).toContain("Calcul de l’écart de simulation…");

    record.texts.length = 0;
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(budgetForecastService.forecast.mock.calls.length).toBeGreaterThan(
        2
      )
    );
    await waitFor(() =>
      expect(screen.getByText(/Avec la Simulation/)).toBeInTheDocument()
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    record.stop();
    expect(record.texts.filter((text) => LOADING.test(text))).toEqual([]);
  });
});

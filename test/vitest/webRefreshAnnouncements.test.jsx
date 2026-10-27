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
import Categories from "../../src/js/pages/Categories";
import ListeOperations from "../../src/js/pages/ListeOperations";
import UpcomingMonths from "../../src/js/pages/UpcomingMonths";
import * as categoryHooks from "../../src/js/hooks/useCategories";
import * as operationHooks from "../../src/js/hooks/useOneOffOperations";
import { useHomeBudget } from "../../src/js/hooks/useHomeBudget";
import { RemainingToLive } from "../../src/js/components/HomeBudget/RemainingToLive";
import { ExpensesByCategoryCard } from "../../src/js/components/HomeBudget/ExpensesByCategoryCard";
import { GoalsCard } from "../../src/js/components/HomeBudget/GoalsCard";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/js/components/Simulation/SimulationContext";
import { categoryService } from "../../src/js/services/categoryService";
import { oneOffOperationsService as operations } from "../../src/js/services/oneOffOperationsService";
import { budgetForecastService } from "../../src/js/services/budgetForecastService";
import { budgetService } from "../../src/js/services/budgetService";
import { goalsService } from "../../src/js/services/goalsService";
import { budgetForecast } from "./fixtures/budgetForecast";
import {
  forecastToday,
  shiftForecastMonth,
} from "../../src/js/utils/budgetForecast";
import { captureLiveRegions, expectAnnouncedIn } from "./liveRegions";

// Services simulés seulement : pages, hooks de données, régions live et
// SimulationProvider sont réels. Les deux spies observent les commandes des
// vrais hooks, sans remplacer leur état ni leurs transitions.
vi.mock("../../src/js/services/categoryService", () => ({
  categoryService: { listAll: vi.fn(), create: vi.fn() },
  categoryErrorCode: () => null,
}));
vi.mock("../../src/js/services/oneOffOperationsService", () => ({
  oneOffOperationsService: {
    listOperations: vi.fn(),
    listAllOperations: vi.fn(),
    listAllCategories: vi.fn(),
    createOperation: vi.fn(),
  },
}));
vi.mock(
  "../../src/js/services/budgetForecastService",
  async (importOriginal) => ({
    ...(await importOriginal()),
    budgetForecastService: { forecast: vi.fn() },
  })
);
vi.mock("../../src/js/services/budgetService", () => ({
  budgetService: { getSummary: vi.fn() },
}));
vi.mock("../../src/js/services/goalsService", () => ({
  goalsService: { listAllGoals: vi.fn() },
}));
// Hors du périmètre #221 : ces panneaux ont leurs propres tests #171.
vi.mock("../../src/js/components/Simulation/SimulationPanel", () => ({
  SimulationPanel: () => null,
}));
vi.mock("../../src/js/components/Simulation/PlanningActions", () => ({
  ForecastPlanning: () => null,
}));
vi.mock("../../src/js/components/charts/EChart", () => ({
  EChart: ({ label }) => <div role="img" aria-label={label} />,
}));
const realCategories = categoryHooks.useCategories;
const realOperations = operationHooks.useOneOffOperations;
const categories = [{ id: 4, name: "Courant", color: null, icon: null }];
const operation = {
  id: 1,
  title: "Courses",
  amount: "20.00",
  currency: "EUR",
  type: "DEPENSE",
  operationDate: "2026-10-20",
  categoryId: 4,
};
const page = { data: [operation], meta: { hasNext: false } };
const summary = (month = "2026-10") => ({
  month,
  currency: "EUR",
  realRemaining: "1000.00",
  monthResult: "1000.00",
  carryIn: "0.00",
  carryFromMonth: null,
  remainingDays: 10,
  realDailyAllowance: "100.00",
  forecast: null,
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const observers = [];
const recordMessages = () => {
  const texts = [];
  const observer = new MutationObserver(() => {
    for (const node of [
      ...screen.queryAllByRole("status"),
      ...screen.queryAllByRole("alert"),
    ])
      if (node.textContent) texts.push(node.textContent);
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  observers.push(observer);
  return texts;
};
const ToggleScenario = () => {
  const simulation = useSimulation();
  return (
    <button onClick={() => simulation.setEnabled(!simulation.enabled)}>
      Changer de scénario
    </button>
  );
};
const wrap = (element) => (
  <MemoryRouter>
    <SimulationProvider>
      <ToggleScenario />
      {element}
    </SimulationProvider>
  </MemoryRouter>
);
const loadingTexts = (texts) =>
  texts.filter((text) => /Chargement|Calcul/.test(text));
let categoryState, operationState, homeState;
const Home = ({ month = "2026-10" }) => {
  homeState = useHomeBudget(month);
  return (
    <>
      <RemainingToLive section={homeState.summary} period="mois" />
      <ExpensesByCategoryCard section={homeState.expenses} currency="EUR" />
      <GoalsCard section={homeState.goals} currency="EUR" />
    </>
  );
};
const settledHome = () =>
  waitFor(() =>
    expect(
      [homeState.summary, homeState.expenses, homeState.goals].every(
        (section) => section.status === "success"
      )
    ).toBe(true)
  );
const startHome = async () => {
  const gate = deferred();
  budgetService.getSummary.mockReturnValueOnce(
    gate.promise.then(() => summary())
  );
  operations.listAllOperations.mockReturnValueOnce(gate.promise.then(() => []));
  goalsService.listAllGoals.mockReturnValueOnce(gate.promise.then(() => []));
  const view = render(wrap(<Home />));
  const regions = captureLiveRegions();
  for (const text of [
    "Chargement du reste à vivre…",
    "Chargement des dépenses…",
    "Chargement des objectifs…",
  ])
    await expectAnnouncedIn(regions, "status", text);
  await act(async () => gate.resolve());
  await settledHome();
  return { view, regions };
};
const startForecast = async (data = budgetForecast()) => {
  const gate = deferred();
  budgetForecastService.forecast.mockReturnValueOnce(gate.promise);
  const view = render(wrap(<UpcomingMonths />));
  const regions = captureLiveRegions();
  await expectAnnouncedIn(regions, "status", "Chargement des prévisions…");
  await act(async () => gate.resolve(data));
  if (data.months.length)
    await screen.findByRole("table", { name: "Prévisions mensuelles" });
  else await screen.findByText("Aucune prévision pour cette période.");
  return { view, regions };
};
beforeEach(() => {
  vi.resetAllMocks();
  categoryService.listAll.mockResolvedValue(categories);
  categoryService.create.mockResolvedValue(categories[0]);
  operations.listOperations.mockResolvedValue(page);
  operations.listAllCategories.mockResolvedValue(categories);
  operations.listAllOperations.mockResolvedValue([]);
  operations.createOperation.mockResolvedValue(operation);
  budgetForecastService.forecast.mockResolvedValue(budgetForecast());
  budgetService.getSummary.mockImplementation(async (month) => summary(month));
  goalsService.listAllGoals.mockResolvedValue([]);
  vi.spyOn(categoryHooks, "useCategories").mockImplementation(() => {
    categoryState = realCategories();
    return categoryState;
  });
  vi.spyOn(operationHooks, "useOneOffOperations").mockImplementation(() => {
    operationState = realOperations();
    return operationState;
  });
});
afterEach(() => {
  observers.forEach((observer) => observer.disconnect());
  observers.length = 0;
  cleanup();
  vi.restoreAllMocks();
});

describe("annonces des listes Web, vrais hooks #221", () => {
  it("Catégories : premier chargement annoncé, mutation puis relecture de la même liste silencieuses", async () => {
    const initial = deferred();
    categoryService.listAll.mockReturnValueOnce(initial.promise);
    render(wrap(<Categories />));
    const regions = captureLiveRegions();
    await expectAnnouncedIn(regions, "status", "Chargement des catégories…");
    await act(async () => initial.resolve(categories));
    await screen.findByText("Courant");
    const texts = recordMessages();
    await act(() =>
      categoryState.saveCategory(null, { name: "Courant", color: null })
    );
    await expectAnnouncedIn(regions, "status", "Catégorie ajoutée.");
    const reload = deferred();
    categoryService.listAll.mockReturnValueOnce(reload.promise);
    let pending;
    await act(async () => {
      pending = categoryState.retry();
    });
    expect(categoryState.status).toBe("loading");
    expect(loadingTexts(texts)).toEqual([]);
    await act(async () => {
      reload.resolve(categories);
      await pending;
    });
  });
  it("Opérations : mutation et rechargement effectifs sans annonce de chargement", async () => {
    const initial = deferred();
    operations.listOperations.mockReturnValueOnce(initial.promise);
    render(wrap(<ListeOperations />));
    const regions = captureLiveRegions();
    await expectAnnouncedIn(regions, "status", "Chargement des opérations…");
    await act(async () => initial.resolve(page));
    await screen.findByText("Courses");
    const texts = recordMessages(),
      reload = deferred();
    operations.listOperations.mockReturnValueOnce(reload.promise);
    let pending;
    await act(async () => {
      pending = operationState.createOperation(operation);
    });
    expect(operationState.status).toBe("success");
    expect(operationState.mutationStatus).toBe("loading");
    expect(operations.listOperations).toHaveBeenCalledTimes(2);
    expect(loadingTexts(texts)).toEqual([]);
    await act(async () => {
      reload.resolve(page);
      await pending;
    });
    await expectAnnouncedIn(regions, "status", "Opération ajoutée.");
  });
  for (const kind of ["Catégories", "Opérations"])
    it(`${kind} : erreur toujours annoncée, nouvelle tentative annoncée`, async () => {
      const isCategory = kind === "Catégories",
        service = isCategory
          ? categoryService.listAll
          : operations.listOperations;
      const gate = deferred();
      service.mockReturnValueOnce(gate.promise);
      render(wrap(isCategory ? <Categories /> : <ListeOperations />));
      const regions = captureLiveRegions();
      const loading = isCategory
        ? "Chargement des catégories…"
        : "Chargement des opérations…";
      await expectAnnouncedIn(regions, "status", loading);
      await act(async () => gate.reject(new Error("offline")));
      await expectAnnouncedIn(
        regions,
        "alert",
        isCategory
          ? "Impossible de charger vos catégories. Vérifiez votre connexion puis réessayez."
          : "Impossible de charger vos opérations. Vérifiez votre connexion puis réessayez."
      );
      const retry = deferred();
      service.mockReturnValueOnce(retry.promise);
      fireEvent.click(
        screen.getByRole("button", { name: "Réessayer", exact: true })
      );
      await expectAnnouncedIn(regions, "status", loading);
      await act(async () => retry.resolve(isCategory ? categories : page));
    });
});

describe("annonces des prochains mois, vrai hook et invalidate() #221", () => {
  it.each([false, true])(
    "actualise sans annonce une prévision déjà affichée (vide=%s)",
    async (empty) => {
      const { regions } = await startForecast(
        empty ? budgetForecast({ months: [] }) : budgetForecast()
      );
      const texts = recordMessages(),
        refresh = deferred();
      budgetForecastService.forecast.mockReturnValueOnce(refresh.promise);
      await act(async () => window.dispatchEvent(new Event("focus")));
      expect(budgetForecastService.forecast).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(loadingTexts(texts)).toEqual([]);
      await act(async () => refresh.resolve(budgetForecast()));
      expect(captureLiveRegions()).toEqual(regions);
    }
  );
  it("annonce chaque nouvelle clé : mois, horizon et scénario", async () => {
    const { regions } = await startForecast();
    const nextMonth = shiftForecastMonth(forecastToday().slice(0, 7), 1);
    for (const change of [
      () =>
        fireEvent.change(screen.getByLabelText("À partir de"), {
          target: { value: nextMonth },
        }),
      () =>
        fireEvent.change(screen.getByLabelText("Horizon de prévision"), {
          target: { value: "6" },
        }),
      () =>
        fireEvent.click(
          screen.getByRole("button", { name: "Changer de scénario" })
        ),
    ]) {
      const gate = deferred();
      budgetForecastService.forecast.mockReturnValueOnce(gate.promise);
      change();
      await expectAnnouncedIn(regions, "status", "Chargement des prévisions…");
      await act(async () => gate.resolve(budgetForecast()));
      await screen.findByRole("table", { name: "Prévisions mensuelles" });
    }
  });
  it("annonce une erreur pendant une actualisation silencieuse puis la relance", async () => {
    const { regions } = await startForecast();
    const texts = recordMessages(),
      refresh = deferred();
    budgetForecastService.forecast.mockReturnValueOnce(refresh.promise);
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(loadingTexts(texts)).toEqual([]);
    await act(async () => refresh.reject(new Error("offline")));
    await expectAnnouncedIn(
      regions,
      "alert",
      "Les prévisions n’ont pas pu être chargées."
    );
    const retry = deferred();
    budgetForecastService.forecast.mockReturnValueOnce(retry.promise);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await expectAnnouncedIn(regions, "status", "Chargement des prévisions…");
    await act(async () => retry.resolve(budgetForecast()));
  });
});

describe("annonces indépendantes de l’accueil, vrais hooks #221", () => {
  it("annonce les premiers chargements, puis tait chaque actualisation de bloc", async () => {
    const { regions } = await startHome();
    const texts = recordMessages();
    const refresh = deferred();
    budgetService.getSummary.mockReturnValueOnce(refresh.promise);
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(homeState.summary.status).toBe("loading");
    expect(loadingTexts(texts)).toEqual([]);
    await act(async () => refresh.resolve(summary()));
    await settledHome();
    for (const [section, service, value] of [
      ["expenses", operations.listAllOperations, []],
      ["goals", goalsService.listAllGoals, []],
    ]) {
      const gate = deferred();
      service.mockReturnValueOnce(gate.promise);
      let pending;
      await act(async () => {
        pending = homeState[section].reload();
      });
      expect(homeState[section].status).toBe("loading");
      expect(loadingTexts(texts)).toEqual([]);
      await act(async () => {
        gate.resolve(value);
        await pending;
      });
      await settledHome();
    }
    expect(captureLiveRegions()).toEqual(regions);
  });
  it("annonce le nouveau mois pour RaV/dépenses et le scénario seulement pour RaV", async () => {
    const { view, regions } = await startHome();
    const next = deferred();
    budgetService.getSummary.mockReturnValueOnce(
      next.promise.then(() => summary("2026-11"))
    );
    operations.listAllOperations.mockReturnValueOnce(
      next.promise.then(() => [])
    );
    view.rerender(wrap(<Home month="2026-11" />));
    await expectAnnouncedIn(regions, "status", "Chargement du reste à vivre…");
    await expectAnnouncedIn(regions, "status", "Chargement des dépenses…");
    await act(async () => next.resolve());
    await settledHome();
    const scenario = deferred();
    budgetService.getSummary.mockReturnValueOnce(scenario.promise);
    fireEvent.click(
      screen.getByRole("button", { name: "Changer de scénario" })
    );
    await expectAnnouncedIn(regions, "status", "Chargement du reste à vivre…");
    await act(async () => scenario.resolve(summary("2026-11")));
    await settledHome();
  });
  for (const [section, serviceName, text] of [
    ["summary", "summary", "Le reste à vivre n’a pas pu être chargé."],
    [
      "expenses",
      "expenses",
      "Les dépenses du mois n’ont pas pu être chargées.",
    ],
    ["goals", "goals", "Les objectifs n’ont pas pu être chargés."],
  ])
    it(`${section} : conserve l’annonce des erreurs et du chargement après échec`, async () => {
      const { regions } = await startHome();
      const texts = recordMessages();
      const service =
        serviceName === "summary"
          ? budgetService.getSummary
          : serviceName === "expenses"
          ? operations.listAllOperations
          : goalsService.listAllGoals;
      const refresh = deferred();
      service.mockReturnValueOnce(refresh.promise);
      let pending;
      await act(async () => {
        pending = homeState[section].reload();
      });
      expect(loadingTexts(texts)).toEqual([]);
      await act(async () => {
        refresh.reject(new Error("offline"));
        await pending;
      });
      await expectAnnouncedIn(regions, "alert", text);
      const retry = deferred();
      service.mockReturnValueOnce(retry.promise);
      fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
      await expectAnnouncedIn(
        regions,
        "status",
        section === "summary"
          ? "Chargement du reste à vivre…"
          : section === "expenses"
          ? "Chargement des dépenses…"
          : "Chargement des objectifs…"
      );
      await act(async () =>
        retry.resolve(section === "summary" ? summary() : [])
      );
      await settledHome();
    });
});

describe("retour d’une saisie invalide #221", () => {
  it("annonce la prévision après correction, même pour la période affichée avant l’erreur", async () => {
    const { regions } = await startForecast();
    const field = screen.getByLabelText("À partir de");
    const previous = field.value;
    fireEvent.change(field, { target: { value: "" } });
    await expectAnnouncedIn(
      regions,
      "alert",
      "Choisissez le mois courant ou l’un des 23 mois suivants."
    );
    const retry = deferred();
    budgetForecastService.forecast.mockReturnValueOnce(retry.promise);
    fireEvent.change(field, { target: { value: previous } });
    await expectAnnouncedIn(regions, "status", "Chargement des prévisions…");
    await act(async () => retry.resolve(budgetForecast()));
  });
});

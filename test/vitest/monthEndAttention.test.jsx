import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MutationFeedbackProvider } from "../../src/js/components/Notifications/MutationFeedbackProvider";
import { MonthEndProvider } from "../../src/js/components/MonthEnd/MonthEndContext";
import { SimulationProvider } from "../../src/js/components/Simulation/SimulationContext";
import { NotificationBell } from "../../src/js/components/MonthEnd/NotificationBell";
import { MonthEndPrompt } from "../../src/js/components/MonthEnd/MonthEndPrompt";
import { SavingsOccurrenceList } from "../../src/js/components/MonthEnd/SavingsOccurrenceList";
import { MonthEndSummary } from "../../src/js/components/MonthEnd/MonthEndSummary";
import { RemainingToLive } from "../../src/js/components/HomeBudget/RemainingToLive";
import { SavingsMovements } from "../../src/js/components/Savings/SavingsMovements";
import { parseBudgetSummary } from "../../src/js/services/budgetService";
import { monthEndService } from "../../src/js/services/monthEndService";
import { savingsService } from "../../src/js/services/savingsService";
import {
  decidedDecision,
  pendingDecision,
  reviewDecision,
  savingsOccurrence,
} from "../fixtures/monthEnd.mjs";

vi.mock("../../src/js/services/monthEndService", async (importOriginal) => ({
  ...(await importOriginal()),
  monthEndService: { get: vi.fn(), save: vi.fn() },
}));
vi.mock("../../src/js/services/savingsService", async (importOriginal) => ({
  ...(await importOriginal()),
  savingsService: {
    pendingOccurrences: vi.fn(),
    resolveOccurrence: vi.fn(),
    movements: vi.fn(),
  },
}));

const page = (data) => ({
  data,
  meta: { limit: 20, hasNext: false, nextCursor: null },
});
const text = (element) => element.textContent.replace(/\s+/g, " ");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

const renderWith = (children) =>
  render(
    <MemoryRouter>
      <MutationFeedbackProvider>
        <SimulationProvider>
          <MonthEndProvider>{children}</MonthEndProvider>
        </SimulationProvider>
      </MutationFeedbackProvider>
    </MemoryRouter>
  );

it("reads October and November from the Paris calendar", async () => {
  monthEndService.get.mockResolvedValue(decidedDecision());
  savingsService.pendingOccurrences.mockResolvedValue(page([]));
  renderWith(<NotificationBell />);
  await waitFor(() =>
    expect(monthEndService.get).toHaveBeenCalledWith("2026-10", "EUR")
  );
  expect(savingsService.pendingOccurrences).toHaveBeenCalledWith({
    month: "2026-11",
    currency: "EUR",
  });
});

it("counts what remains to do, opens a non-modal panel and restores focus", async () => {
  monthEndService.get.mockResolvedValue(pendingDecision());
  savingsService.pendingOccurrences.mockResolvedValue(
    page([savingsOccurrence()])
  );
  renderWith(<NotificationBell />);
  const bell = await screen.findByRole("button", {
    name: "Notifications, 2 à traiter",
  });
  expect(bell).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(bell);
  expect(bell).toHaveAttribute("aria-expanded", "true");
  const panel = screen.getByRole("region", { name: "À traiter" });
  expect(text(panel)).toMatch(/Décision d’octobre en attente/);
  expect(text(panel)).toMatch(/150,00 € disponibles fin octobre/);
  expect(text(panel)).toMatch(/Versement mensuel à confirmer/);
  await waitFor(() =>
    expect(within(panel).getByRole("link", { name: "Décider" })).toHaveFocus()
  );
  expect(within(panel).getByRole("link", { name: "Décider" })).toHaveAttribute(
    "href",
    "/fin-de-mois/2026-10"
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(panel).not.toBeVisible();
  expect(bell).toHaveFocus();
});

it("confirms a planned transfer from the bell and removes it", async () => {
  monthEndService.get.mockResolvedValue(decidedDecision());
  savingsService.pendingOccurrences
    .mockResolvedValueOnce(page([savingsOccurrence()]))
    .mockResolvedValue(page([]));
  savingsService.resolveOccurrence.mockResolvedValue({
    status: "CONFIRMED",
    movement: null,
  });
  renderWith(<NotificationBell />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Notifications, 1 à traiter" })
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmer le virement" })
  );
  await waitFor(() =>
    expect(savingsService.resolveOccurrence).toHaveBeenCalledWith(
      1,
      "2026-11",
      "CONFIRMED"
    )
  );
  expect(
    await screen.findByRole("button", { name: "Notifications, rien à traiter" })
  ).toBeInTheDocument();
  expect(screen.getByText(/Rien à traiter pour le moment/)).toBeInTheDocument();
});

it("proposes the decision on the home page, then keeps a reminder after « Plus tard »", async () => {
  monthEndService.get.mockResolvedValue(pendingDecision());
  savingsService.pendingOccurrences.mockResolvedValue(page([]));
  renderWith(
    <>
      <MonthEndPrompt />
      <NotificationBell />
    </>
  );
  const banner = await screen.findByRole("region", {
    name: /^Il vous reste 150,00\s€ d’octobre$/,
  });
  expect(text(banner)).toMatch(/Sans réponse, tout reste reporté/);
  fireEvent.click(within(banner).getByRole("button", { name: "Plus tard" }));
  expect(screen.queryByRole("region", { name: /Il vous reste/ })).toBeNull();
  expect(screen.getByText(/Décision d’octobre en attente/)).toBeInTheDocument();
  expect(window.sessionStorage.getItem("mhw:month-end-later:2026-10")).toBe(
    "1"
  );
  // Le rappel reste dans la cloche.
  expect(
    screen.getByRole("button", { name: "Notifications, 1 à traiter" })
  ).toBeInTheDocument();
});

it("warns on the home page when a correction changes the carry", async () => {
  monthEndService.get.mockResolvedValue(reviewDecision());
  savingsService.pendingOccurrences.mockResolvedValue(page([]));
  renderWith(<MonthEndPrompt />);
  const warning = await screen.findByRole("region", {
    name: /À revoir : octobre a changé/,
  });
  expect(text(warning)).toMatch(/100,00 €/);
  expect(text(warning)).toMatch(/50,00 € → 20,00 €/);
  expect(
    within(warning).getByRole("link", { name: "Revoir la décision d’octobre" })
  ).toHaveAttribute("href", "/fin-de-mois/2026-10");
});

it("lists planned transfers with explicit labels and refuses one", async () => {
  monthEndService.get.mockResolvedValue(decidedDecision());
  savingsService.pendingOccurrences
    .mockResolvedValueOnce(page([savingsOccurrence()]))
    .mockResolvedValue(page([]));
  savingsService.resolveOccurrence.mockResolvedValue({
    status: "CANCELED",
    movement: null,
  });
  renderWith(<SavingsOccurrenceList />);
  const refuse = await screen.findByRole("button", {
    name: /^Ne pas verser les 120,00\s€ prévus le 1(er)? novembre 2026 pour Voyage au Japon$/,
  });
  fireEvent.click(refuse);
  await waitFor(() =>
    expect(savingsService.resolveOccurrence).toHaveBeenCalledWith(
      1,
      "2026-11",
      "CANCELED"
    )
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: /Virements prévus/ })
    ).toBeNull()
  );
});

it("shows the decision in a closed month summary, or invites to decide", () => {
  const { rerender } = render(
    <MemoryRouter>
      <MonthEndSummary
        summary={{ month: "2026-10", monthEndDecision: reviewDecision() }}
      />
    </MemoryRouter>
  );
  expect(screen.getByText("! À revoir")).toBeInTheDocument();
  expect(text(document.body)).toMatch(/Report sur novembre\s?\+\s?20,00 €/);
  expect(
    screen.getByRole("link", { name: "Revoir la décision" })
  ).toHaveAttribute("href", "/fin-de-mois/2026-10");
  rerender(
    <MemoryRouter>
      <MonthEndSummary summary={{ month: "2026-10" }} />
    </MemoryRouter>
  );
  expect(text(document.body)).toMatch(
    /Tout le solde d’octobre est reporté sur novembre/
  );
  expect(
    screen.getByRole("link", { name: "Décider du solde" })
  ).toBeInTheDocument();
});

it("explains the carry of the decided month in the calculation detail (#392)", async () => {
  monthEndService.get.mockResolvedValue(reviewDecision());
  savingsService.pendingOccurrences.mockResolvedValue(page([]));
  const data = parseBudgetSummary({
    month: "2026-11",
    currency: "EUR",
    status: "OPEN",
    revision: 1,
    correctedAt: null,
    balanceStatus: "POSITIVE",
    fixedIncome: "2000.00",
    fixedExpense: "800.00",
    base: "1200.00",
    carryIn: "20.00",
    carryFromMonth: "2026-10",
    actualIncome: "0.00",
    actualExpense: "40.00",
    monthResult: "1160.00",
    realRemaining: "1180.00",
    remainingDays: 21,
    realDailyAllowance: "56.19",
    unresolvedEvents: 0,
    forecast: null,
    days: [],
  });
  renderWith(
    <RemainingToLive
      section={{ status: "success", data, loadingKey: "k", reload: vi.fn() }}
      period="mois"
    />
  );
  expect(
    await screen.findByText(
      /Après votre décision de fin de mois : 100,00\s€ épargnés/
    )
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Voir le détail du calcul" })
  );
  const detail = screen.getByRole("dialog", { name: "Détail du calcul" });
  expect(text(detail)).toMatch(/dont disponible avant décision\s?\+\s?120,00/);
  expect(text(detail)).toMatch(/dont épargné en fin de mois\s?[−-]\s?100,00/);
  expect(text(detail)).toMatch(/ne s’ajoutent pas une seconde fois/);
});

it("labels month-end movements and their compensations in the vault", async () => {
  monthEndService.get.mockResolvedValue(decidedDecision());
  savingsService.pendingOccurrences.mockResolvedValue(page([]));
  const base = {
    accountId: 1,
    currency: "EUR",
    type: "VIREMENT",
    operationDate: "2026-10-31",
    reason: "MONTH_END",
    idempotencyKey: "month-end:fixture",
  };
  savingsService.movements.mockResolvedValue(
    page([
      {
        ...base,
        id: 2,
        direction: "FROM_SAVINGS",
        amountMinorUnits: 5000,
        monthEndRevision: 2,
        isCompensation: true,
      },
      {
        ...base,
        id: 1,
        direction: "TO_SAVINGS",
        amountMinorUnits: 15000,
        monthEndRevision: 1,
        isCompensation: false,
      },
    ])
  );
  renderWith(<SavingsMovements accountId={1} />);
  expect(
    await screen.findByText("Correction : épargne de fin de mois")
  ).toBeInTheDocument();
  expect(screen.getByText("Épargne de fin de mois")).toBeInTheDocument();
  expect(screen.getByText("Compensation")).toBeInTheDocument();
  expect(
    screen.getByText("Décision de fin de mois · révision 2")
  ).toBeInTheDocument();
});

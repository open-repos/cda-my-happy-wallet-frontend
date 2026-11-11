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
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FinDeMois from "../../src/js/pages/FinDeMois";
import { MutationFeedbackProvider } from "../../src/js/components/Notifications/MutationFeedbackProvider";
import { MonthEndProvider } from "../../src/js/components/MonthEnd/MonthEndContext";
import { monthEndService } from "../../src/js/services/monthEndService";
import { savingsService } from "../../src/js/services/savingsService";
import {
  decidedDecision,
  deficitDecision,
  pendingDecision,
  reviewDecision,
} from "../fixtures/monthEnd.mjs";

vi.mock("../../src/js/services/monthEndService", async (importOriginal) => ({
  ...(await importOriginal()),
  monthEndService: { get: vi.fn(), save: vi.fn() },
}));
vi.mock("../../src/js/services/savingsService", async (importOriginal) => ({
  ...(await importOriginal()),
  savingsService: {
    accounts: vi.fn(),
    pendingOccurrences: vi.fn(),
    resolveOccurrence: vi.fn(),
  },
}));

const accounts = [
  {
    id: 1,
    name: "Voyage au Japon",
    currency: "EUR",
    initialBalanceMinorUnits: 0,
    balanceMinorUnits: 243000,
    archived: false,
    goalId: 3,
  },
  {
    id: 2,
    name: "Épargne de sécurité",
    currency: "EUR",
    initialBalanceMinorUnits: 0,
    balanceMinorUnits: 390000,
    archived: false,
    goalId: null,
  },
  {
    id: 3,
    name: "Ancien compte",
    currency: "EUR",
    initialBalanceMinorUnits: 0,
    balanceMinorUnits: 100,
    archived: true,
    goalId: null,
  },
];
const page = (data) => ({
  data,
  meta: { limit: 20, hasNext: false, nextCursor: null },
});
const text = (element) => element.textContent.replace(/\s+/g, " ");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));
  savingsService.accounts.mockResolvedValue(page(accounts));
  savingsService.pendingOccurrences.mockResolvedValue(page([]));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});

const renderPage = (month = "2026-10") =>
  render(
    <MemoryRouter initialEntries={[`/fin-de-mois/${month}`]}>
      <MutationFeedbackProvider>
        <MonthEndProvider>
          <Routes>
            <Route path="/fin-de-mois/:month" element={<FinDeMois />} />
            <Route path="/home" element={<p>Accueil</p>} />
          </Routes>
        </MonthEndProvider>
      </MutationFeedbackProvider>
    </MemoryRouter>
  );

it("dates the transfers on the last day of the closed month", async () => {
  monthEndService.get.mockResolvedValue(pendingDecision());
  renderPage();
  await screen.findByRole("heading", { name: /Décider du solde/ });
  fireEvent.click(screen.getByLabelText(/Répartir/));
  expect(
    screen.getByText(/daté du dernier jour d’octobre/)
  ).toBeInTheDocument();
});

it("splits 150 € into 100 € saved and 50 € carried, then shows the decision", async () => {
  monthEndService.get
    .mockResolvedValueOnce(pendingDecision()) // contexte
    .mockResolvedValueOnce(pendingDecision()) // page
    .mockResolvedValue(decidedDecision());
  monthEndService.save.mockResolvedValue(decidedDecision());
  renderPage();
  await screen.findByRole("heading", {
    name: "Décider du solde d’octobre 2026",
  });
  expect(screen.queryByText("Ancien compte", { exact: false })).toBeNull();
  fireEvent.click(screen.getByLabelText(/Répartir/));
  fireEvent.change(screen.getByLabelText(/Épargner sur Voyage au Japon/), {
    target: { value: "100" },
  });
  const preview = screen.getByRole("complementary", { name: "Votre décision" });
  expect(text(preview)).toMatch(/Aperçu · Report sur novembre\s?50,00 €/);
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  await waitFor(() => expect(monthEndService.save).toHaveBeenCalledOnce());
  const [month, body] = monthEndService.save.mock.calls[0];
  expect(month).toBe("2026-10");
  expect(body).toMatchObject({
    expectedRevision: 0,
    savings: [{ accountId: 1, amountMinorUnits: 10000 }],
    coverage: [],
    exceptionalIncomeMinorUnits: 0,
  });
  expect(body.idempotencyKey).toMatch(/^decision-2026-10-/);
  expect(
    await screen.findByRole("heading", { name: "Décision d’octobre 2026" })
  ).toBeInTheDocument();
  expect(screen.getByText("✓ Décidée")).toBeInTheDocument();
});

it("explains blocking errors and focuses the invalid field", async () => {
  monthEndService.get.mockResolvedValue(pendingDecision());
  renderPage();
  await screen.findByRole("heading", { name: /Décider du solde/ });
  fireEvent.click(screen.getByLabelText(/Tout épargner/));
  fireEvent.change(screen.getByLabelText(/Épargner sur Voyage au Japon/), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  expect(
    text(
      screen.getByText("La décision n’a pas été enregistrée :").parentElement
    )
  ).toMatch(/répartissez encore 50,00/);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Mettre le reste sur ce compte" })[1]
  );
  expect(screen.getByLabelText(/Épargner sur Épargne de sécurité/)).toHaveValue(
    "50,00"
  );
  fireEvent.change(screen.getByLabelText(/Épargner sur Voyage au Japon/), {
    target: { value: "abc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  const field = screen.getByLabelText(/Épargner sur Voyage au Japon/);
  expect(field).toHaveAttribute("aria-invalid", "true");
  await waitFor(() => expect(field).toHaveFocus());
  expect(monthEndService.save).not.toHaveBeenCalled();
});

it("covers a 150 € deficit with savings and exceptional income", async () => {
  const pendingDeficit = pendingDecision({
    resultBeforeDecisionMinorUnits: -15000,
    referenceResultMinorUnits: -15000,
    carryMinorUnits: -15000,
  });
  monthEndService.get.mockResolvedValue(pendingDeficit);
  monthEndService.save.mockResolvedValue(deficitDecision());
  renderPage();
  await screen.findByText("Que faire du déficit ?");
  fireEvent.click(screen.getByLabelText(/Couvrir tout ou partie/));
  fireEvent.change(screen.getByLabelText(/Prélever sur Épargne de sécurité/), {
    target: { value: "50" },
  });
  fireEvent.change(screen.getByLabelText(/Montant reçu pour couvrir octobre/), {
    target: { value: "70" },
  });
  expect(
    text(screen.getByRole("complementary", { name: "Votre décision" }))
  ).toMatch(/Déficit reporté sur novembre\s?[−-]\s?30,00 €/);
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  await waitFor(() => expect(monthEndService.save).toHaveBeenCalledOnce());
  expect(monthEndService.save.mock.calls[0][1]).toMatchObject({
    savings: [],
    coverage: [{ accountId: 2, amountMinorUnits: 5000 }],
    exceptionalIncomeMinorUnits: 7000,
  });
});

it("warns after a correction and keeps the decision with the same allocations", async () => {
  monthEndService.get.mockResolvedValue(reviewDecision());
  monthEndService.save.mockResolvedValue(
    decidedDecision({
      revision: 2,
      resultBeforeDecisionMinorUnits: 12000,
      referenceResultMinorUnits: 12000,
      carryMinorUnits: 2000,
    })
  );
  renderPage();
  const warning = await screen.findByRole("region", {
    name: /À revoir : octobre a changé/,
  });
  expect(text(warning)).toMatch(/épargne reste à 100,00 €/);
  expect(text(warning)).toMatch(/50,00 € → 20,00 €/);
  fireEvent.click(
    within(warning).getByRole("button", { name: "Garder ma décision" })
  );
  await waitFor(() => expect(monthEndService.save).toHaveBeenCalledOnce());
  expect(monthEndService.save.mock.calls[0][1]).toMatchObject({
    expectedRevision: 1,
    savings: [{ accountId: 1, amountMinorUnits: 10000 }],
  });
});

it("reloads the latest decision after a revision conflict", async () => {
  monthEndService.get.mockResolvedValue(decidedDecision());
  monthEndService.save.mockRejectedValue({
    response: {
      status: 409,
      data: { error: { details: { code: "REVISION_CONFLICT" } } },
    },
  });
  renderPage();
  fireEvent.click(
    await screen.findByRole("button", { name: "Modifier la décision" })
  );
  fireEvent.change(screen.getByLabelText(/Épargner sur Voyage au Japon/), {
    target: { value: "120" },
  });
  const calls = monthEndService.get.mock.calls.length;
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  await waitFor(() => expect(monthEndService.save).toHaveBeenCalledOnce());
  expect(
    (await screen.findAllByText(/a changé sur un autre appareil/)).length
  ).toBeGreaterThan(0);
  await waitFor(() =>
    expect(monthEndService.get.mock.calls.length).toBeGreaterThan(calls)
  );
});

it("reuses the idempotency key when retrying an uncertain attempt", async () => {
  monthEndService.get.mockResolvedValue(pendingDecision());
  monthEndService.save
    .mockRejectedValueOnce({ request: {} })
    .mockResolvedValue(decidedDecision());
  renderPage();
  await screen.findByRole("heading", { name: /Décider du solde/ });
  fireEvent.click(screen.getByLabelText(/Répartir/));
  fireEvent.change(screen.getByLabelText(/Épargner sur Voyage au Japon/), {
    target: { value: "100" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  await screen.findByText(/résultat de l’enregistrement est incertain/);
  fireEvent.click(screen.getByRole("button", { name: "Valider la décision" }));
  await waitFor(() => expect(monthEndService.save).toHaveBeenCalledTimes(2));
  expect(monthEndService.save.mock.calls[1][1].idempotencyKey).toBe(
    monthEndService.save.mock.calls[0][1].idempotencyKey
  );
});

it("refuses the current month without calling the decision for it", async () => {
  monthEndService.get.mockResolvedValue(pendingDecision());
  renderPage("2026-11");
  expect(
    await screen.findByText(/Novembre 2026 n’est pas encore terminé/)
  ).toBeInTheDocument();
  expect(monthEndService.save).not.toHaveBeenCalled();
});

it("offers only « Modifier » when the kept plan would exceed the new balance", async () => {
  monthEndService.get.mockResolvedValue(
    decidedDecision({
      resultBeforeDecisionMinorUnits: 9000,
      carryMinorUnits: -1000,
      requiresReview: true,
      correctionDeltaMinorUnits: -6000,
    })
  );
  renderPage();
  const warning = await screen.findByRole("region", {
    name: /À revoir : octobre a changé/,
  });
  expect(
    within(warning).queryByRole("button", { name: "Garder ma décision" })
  ).toBeNull();
  expect(text(warning)).toMatch(/ne correspond plus au nouveau solde/);
  expect(
    within(warning).getByRole("button", { name: "Modifier la décision" })
  ).toBeInTheDocument();
});

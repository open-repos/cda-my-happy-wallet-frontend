import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SavingsForm } from "../../src/js/components/Savings/SavingsForm";
import { FinancialGoalForm } from "../../src/js/components/FinancialGoals/FinancialGoalForm";
import { savingsAccount, savingsGoal } from "../fixtures/savings.mjs";
import { savingsService } from "../../src/js/services/savingsService";
vi.mock("../../src/js/services/savingsService", async (importOriginal) => ({
  ...(await importOriginal()),
  savingsService: {
    transfer: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
}));
afterEach(cleanup);
const mutation = (run) => ({ run, busy: false, message: "", error: false });
it("keeps the exact transfer and key on an ambiguous retry, locking its fields", async () => {
  const run = vi
    .fn()
    .mockImplementationOnce(async (write) => {
      await write();
      return { ok: false, uncertain: true };
    })
    .mockImplementationOnce(async (write) => {
      await write();
      return { ok: false, uncertain: false };
    })
    .mockImplementationOnce(async (write) => {
      await write();
      return { ok: true };
    });
  const close = vi.fn();
  render(
    <SavingsForm
      mode="deposit"
      account={savingsAccount}
      goals={[]}
      mutation={mutation(run)}
      onClose={close}
    />
  );
  fireEvent.change(screen.getByLabelText("Montant à déposer"), {
    target: { value: "12,34" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Déposer" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Montant à déposer")).toBeDisabled()
  );
  expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Reprendre ce virement" })
  );
  await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText("Montant à déposer")).toBeDisabled();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Reprendre ce virement" })
  );
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(savingsService.transfer.mock.calls[0]).toEqual(
    savingsService.transfer.mock.calls[1]
  );
  expect(savingsService.transfer.mock.calls[0]).toEqual(
    savingsService.transfer.mock.calls[2]
  );
  expect(savingsService.transfer).toHaveBeenLastCalledWith(
    1,
    expect.objectContaining({
      amountMinorUnits: 1234,
      direction: "TO_SAVINGS",
      reason: "MANUAL",
    })
  );
  expect(savingsService.transfer.mock.calls[0][1].idempotencyKey).toMatch(
    /^[A-Za-z0-9:_-]{8,100}$/
  );
});
it("rejects invalid amounts and future dates before making a request", async () => {
  const run = vi.fn();
  render(
    <SavingsForm
      mode="withdraw"
      account={savingsAccount}
      goals={[]}
      mutation={mutation(run)}
      onClose={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText("Montant à retirer"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("Date du virement"), {
    target: { value: "2999-01-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
  expect(await screen.findByText(/strictement positif/)).toBeVisible();
  expect(run).not.toHaveBeenCalled();
});
it("submits the initial balance as existing savings and never as a transfer", async () => {
  const run = vi.fn().mockImplementation(async (write) => {
    await write();
    return { ok: true };
  });
  render(
    <SavingsForm
      mode="create"
      goals={[]}
      mutation={mutation(run)}
      onClose={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText("Nom du compte"), {
    target: { value: " Maison " },
  });
  fireEvent.change(screen.getByLabelText("Solde initial"), {
    target: { value: "2 000,01" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));
  await waitFor(() => expect(run).toHaveBeenCalledOnce());
  expect(savingsService.create).toHaveBeenCalledWith({
    name: "Maison",
    currency: "EUR",
    initialBalanceMinorUnits: 200001,
  });
});
it("keeps a linked goal balance read-only and preserves its currency", async () => {
  const save = vi.fn();
  render(
    <FinancialGoalForm
      goal={{ ...savingsGoal, currency: "USD" }}
      onSave={save}
      onCancel={vi.fn()}
    />
  );
  const balance = screen.getByRole("textbox", { name: /Déjà épargné/ });
  expect(balance).toHaveAttribute("readonly");
  expect(balance).toHaveAttribute("aria-describedby", "goal-linked-balance");
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD", savedAmount: "2430.00" })
    )
  );
});

it("keeps validation errors associated with the unlinked goal's amount fields", async () => {
  render(<FinancialGoalForm onSave={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  const target = screen.getByRole("textbox", { name: /Montant cible/ });
  expect(target).toHaveAttribute("aria-invalid", "true");
  expect(target).toHaveAttribute("aria-describedby", "goal-targetAmount-error");
});

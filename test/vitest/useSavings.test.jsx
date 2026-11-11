import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  useSavingsPage,
  useSavingsMutation,
  useSavingsRead,
} from "../../src/js/hooks/useSavings";
import {
  SimulationProvider,
  useSimulation,
} from "../../src/js/components/Simulation/SimulationContext";
import { savingsService } from "../../src/js/services/savingsService";
import { savingsAccount, savingsPage } from "../fixtures/savings.mjs";
import { AcknowledgedWriteError } from "../../src/js/utils/acknowledgedWrite";
vi.mock("../../src/js/services/savingsService", () => ({
  savingsService: {
    accounts: vi.fn(),
    movements: vi.fn(),
    currentMovements: vi.fn(),
  },
  savingsErrorMessage: () => "Échec de lecture",
}));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
it("loads, retries, deduplicates pages and blocks simultaneous pagination", async () => {
  savingsService.accounts
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce(savingsPage([savingsAccount], "next"));
  const { result } = renderHook(() => useSavingsPage("accounts", {}));
  await waitFor(() => expect(result.current.status).toBe("error"));
  await act(async () => result.current.reload());
  expect(result.current.data).toHaveLength(1);
  let resolve;
  savingsService.accounts.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  let first;
  act(() => {
    first = result.current.loadMore();
    result.current.loadMore();
  });
  expect(savingsService.accounts).toHaveBeenCalledTimes(3);
  await act(async () => {
    resolve(savingsPage([savingsAccount, { ...savingsAccount, id: 2 }]));
    await first;
  });
  expect(result.current.data.map((a) => a.id)).toEqual([1, 2]);
});
it("discards a late response after switching the account", async () => {
  let resolve;
  savingsService.movements.mockImplementation(({ accountId }) =>
    accountId === 1
      ? new Promise((r) => {
          resolve = r;
        })
      : Promise.resolve(savingsPage([{ id: 2 }]))
  );
  const { result, rerender } = renderHook(
    ({ id }) => useSavingsPage("movements", { accountId: id }),
    { initialProps: { id: 1 } }
  );
  rerender({ id: 2 });
  await waitFor(() => expect(result.current.data).toEqual([{ id: 2 }]));
  await act(async () => resolve(savingsPage([{ id: 1 }])));
  expect(result.current.data).toEqual([{ id: 2 }]);
});
it("deduplicates current operations by source and id", async () => {
  savingsService.currentMovements
    .mockResolvedValueOnce(
      savingsPage([{ id: 1, source: "OPERATION" }], "next")
    )
    .mockResolvedValueOnce(savingsPage([{ id: 1, source: "VIREMENT" }]));
  const { result } = renderHook(() =>
    useSavingsPage("currentMovements", { month: "2026-11", currency: "EUR" })
  );
  await waitFor(() => expect(result.current.status).toBe("success"));
  await act(async () => result.current.loadMore());
  expect(result.current.data).toHaveLength(2);
});
it.each([false, true])(
  "never replays a committed write after failed refresh (unreadable=%s)",
  async (unreadable) => {
    const reload = vi.fn().mockResolvedValue(false);
    const write = unreadable
      ? vi.fn().mockRejectedValue(new AcknowledgedWriteError())
      : vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useSavingsMutation(reload));
    let outcome;
    await act(async () => {
      outcome = await result.current.run(write, "Enregistré");
    });
    expect(outcome.ok).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(result.current.message).toMatch(/enregistrée/);
    expect(reload).toHaveBeenCalledOnce();
  }
);
it("blocks double writes and marks lost responses as ambiguous", async () => {
  let reject;
  const write = vi.fn(
    () =>
      new Promise((_, r) => {
        reject = r;
      })
  );
  const { result } = renderHook(() => useSavingsMutation(vi.fn()));
  let pending;
  act(() => {
    pending = result.current.run(write, "ok");
    result.current.run(write, "ok");
  });
  expect(write).toHaveBeenCalledOnce();
  await act(async () => {
    reject({ request: {}, response: undefined });
    expect(await pending).toMatchObject({ ok: false, uncertain: true });
  });
});

it.each([
  [false, false],
  [true, true],
])(
  "a failed refresh of a background read (%s) reports refreshed=%s",
  async (background, expected) => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValue(new Error());
    const { result } = renderHook(
      () => ({
        badge: useSavingsRead(read, "badge", undefined, { background }),
        simulation: useSimulation(),
      }),
      { wrapper: SimulationProvider }
    );
    await waitFor(() => expect(result.current.badge.status).toBe("success"));
    let refreshed;
    await act(async () => {
      refreshed = await result.current.simulation.refreshViews();
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(result.current.badge.status).toBe("error");
    expect(refreshed).toBe(expected);
  }
);

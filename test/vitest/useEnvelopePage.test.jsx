import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useEnvelopePage } from "../../src/js/hooks/useEnvelopePage";
import { envelopesService } from "../../src/js/services/envelopesService";
vi.mock("../../src/js/services/envelopesService", () => ({
  envelopesService: { overview: vi.fn() },
  envelopeErrorMessage: () =>
    "Impossible de charger les enveloppes. Réessayez.",
}));
const page = (id, next = null) => ({
  data: [{ id }],
  meta: { limit: 20, hasNext: Boolean(next), nextCursor: next },
});
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
it("ignores a late response from a previous currency or period", async () => {
  let oldReply, newReply;
  envelopesService.overview.mockImplementation(
    (query) =>
      new Promise((resolve) => {
        if (query.currency === "EUR") oldReply = resolve;
        else newReply = resolve;
      })
  );
  const { result, rerender } = renderHook(
    ({ currency }) =>
      useEnvelopePage("overview", { month: "2026-10", currency }),
    { initialProps: { currency: "EUR" } }
  );
  rerender({ currency: "USD" });
  await act(async () => newReply(page(2)));
  expect(result.current.data).toEqual([{ id: 2 }]);
  await act(async () => oldReply(page(1)));
  expect(result.current.data).toEqual([{ id: 2 }]);
});
it("locks a double pagination request and detects repeated cursors without duplicating rows", async () => {
  let reply;
  envelopesService.overview
    .mockResolvedValueOnce(page(1, "next"))
    .mockImplementation(() => new Promise((resolve) => (reply = resolve)));
  const { result } = renderHook(() =>
    useEnvelopePage("overview", { month: "2026-10", currency: "EUR" })
  );
  await waitFor(() => expect(result.current.status).toBe("success"));
  act(() => {
    result.current.loadMore();
    result.current.loadMore();
  });
  expect(envelopesService.overview).toHaveBeenCalledTimes(2);
  await act(async () =>
    reply({
      data: [{ id: 1 }, { id: 2 }],
      meta: { limit: 20, hasNext: true, nextCursor: "next" },
    })
  );
  expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);
  await act(async () => result.current.loadMore());
  expect(result.current.message).toMatch(/Pagination interrompue/);
  expect(envelopesService.overview).toHaveBeenCalledTimes(2);
});
it("retries a failed read and does not request a disabled section", async () => {
  envelopesService.overview
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(page(3));
  const { result, rerender } = renderHook(
    ({ enabled }) => useEnvelopePage("overview", { currency: "EUR" }, enabled),
    { initialProps: { enabled: false } }
  );
  expect(envelopesService.overview).not.toHaveBeenCalled();
  rerender({ enabled: true });
  await waitFor(() => expect(result.current.status).toBe("error"));
  await act(async () => result.current.reload());
  expect(result.current.data).toEqual([{ id: 3 }]);
});

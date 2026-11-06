import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaginatedOptions } from "../../src/js/hooks/usePaginatedOptions";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, ko) => {
    resolve = ok;
    reject = ko;
  });
  return { promise, resolve, reject };
};
const page = (values, nextCursor = null) => ({
  data: values.map((v) => ({ value: v, label: v })),
  meta: { limit: 10, hasNext: Boolean(nextCursor), nextCursor },
});
const flush = () => act(async () => {});

/** Source simulée : chaque appel reste en attente jusqu'à sa résolution. */
const controlledSource = () => {
  const calls = [];
  const load = vi.fn((request) => {
    const call = { ...request, ...deferred() };
    calls.push(call);
    return call.promise;
  });
  return { load, calls };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("usePaginatedOptions (#360)", () => {
  it("charge la première page à l'ouverture, sans temporisation", async () => {
    const { load, calls } = controlledSource();
    const { result } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load })
    );
    act(() => result.current.ensureLoaded());
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ query: "", cursor: null, limit: 10 })
    );
    expect(result.current.status).toBe("loading");
    calls[0].resolve(page(["A", "B"], "c2"));
    await flush();
    expect(result.current.options.map((o) => o.value)).toEqual(["A", "B"]);
    expect(result.current.hasNext).toBe(true);
    expect(result.current.status).toBe("ready");
    act(() => result.current.ensureLoaded());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("temporise la saisie et n'affiche jamais une ancienne réponse", async () => {
    const { load, calls } = controlledSource();
    const { result } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load, debounceMs: 250 })
    );
    act(() => result.current.ensureLoaded());
    act(() => result.current.search("co"));
    expect(calls[0].signal.aborted).toBe(true);
    expect(result.current.options).toEqual([]);
    act(() => result.current.search("cou"));
    act(() => vi.advanceTimersByTime(249));
    expect(load).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1));
    expect(load).toHaveBeenCalledTimes(2);
    expect(calls[1].query).toBe("cou");
    calls[0].resolve(page(["Ancienne"]));
    await flush();
    expect(result.current.options).toEqual([]);
    expect(result.current.status).toBe("loading");
    calls[1].resolve(page(["Courses"]));
    await flush();
    expect(result.current.options.map((o) => o.value)).toEqual(["Courses"]);
  });

  it("charge la suite avec le curseur et écarte les doublons", async () => {
    const { load, calls } = controlledSource();
    const { result } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load })
    );
    act(() => result.current.ensureLoaded());
    calls[0].resolve(page(["A", "B"], "c2"));
    await flush();
    act(() => result.current.loadMore());
    act(() => result.current.loadMore());
    expect(load).toHaveBeenCalledTimes(2);
    expect(calls[1].cursor).toBe("c2");
    calls[1].resolve(page(["B", "C"]));
    await flush();
    expect(result.current.options.map((o) => o.value)).toEqual(["A", "B", "C"]);
    expect(result.current.lastAdded).toBe(1);
    expect(result.current.hasNext).toBe(false);
    act(() => result.current.loadMore());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("garde les valeurs chargées en cas d'erreur et réessaie la même page", async () => {
    const { load, calls } = controlledSource();
    const { result } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load })
    );
    act(() => result.current.ensureLoaded());
    calls[0].resolve(page(["A"], "c2"));
    await flush();
    act(() => result.current.loadMore());
    calls[1].reject(new Error("500"));
    await flush();
    expect(result.current.status).toBe("error");
    expect(result.current.options.map((o) => o.value)).toEqual(["A"]);
    act(() => result.current.retry());
    expect(calls[2].cursor).toBe("c2");
  });

  it("annule la requête en cours à la fermeture et au démontage", async () => {
    const { load, calls } = controlledSource();
    const { result, unmount } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load })
    );
    act(() => result.current.ensureLoaded());
    act(() => result.current.cancel());
    expect(calls[0].signal.aborted).toBe(true);
    expect(result.current.status).toBe("idle");
    act(() => result.current.ensureLoaded());
    unmount();
    expect(calls[1].signal.aborted).toBe(true);
  });

  it("recharge après l'annulation d'un rechargement complet", async () => {
    const { load, calls } = controlledSource();
    const { result } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load })
    );
    act(() => result.current.ensureLoaded());
    calls[0].resolve(page(["A"], "c2"));
    await flush();
    act(() => result.current.loadMore());
    calls[1].reject(new Error("500"));
    await flush();
    act(() => result.current.cancel());
    act(() => result.current.ensureLoaded());
    expect(calls[2].cursor).toBeNull();
    act(() => result.current.cancel());
    expect(result.current.status).toBe("idle");
    act(() => result.current.ensureLoaded());
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("repart d'une requête donnée sans charger avant l'ouverture", () => {
    const { load } = controlledSource();
    const { result } = renderHook(() =>
      usePaginatedOptions({ loadOptions: load })
    );
    act(() => result.current.reset("Courses"));
    expect(load).not.toHaveBeenCalled();
    act(() => result.current.ensureLoaded());
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ query: "Courses" })
    );
  });
});

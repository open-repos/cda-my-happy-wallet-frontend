import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INITIAL = {
  query: "",
  options: [],
  cursor: null,
  hasNext: false,
  status: "idle",
  loadedQuery: null,
  lastAdded: 0,
  revision: 0,
};

const optionKey = (option) => String(option.value);

/** Paginated, debounced suggestions for a filter field (#360).
 *
 * `loadOptions({query, cursor, limit, signal})` must resolve to the API
 * envelope `{data: [{value, label}], meta: {hasNext, nextCursor}}`. Each new
 * request aborts the previous one and late responses are ignored, so options
 * from an older query are never displayed. */
export const usePaginatedOptions = ({
  loadOptions,
  pageSize = 10,
  debounceMs = 250,
}) => {
  const [state, setState] = useState(INITIAL);
  const store = useRef(INITIAL);
  const loader = useRef(loadOptions);
  const controller = useRef(null);
  const request = useRef(0);
  const timer = useRef(null);
  loader.current = loadOptions;

  const commit = useCallback((patch) => {
    store.current = { ...store.current, ...patch };
    setState(store.current);
  }, []);

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    controller.current?.abort();
    request.current += 1;
  }, []);

  const fetchPage = useCallback(
    (reset) => {
      const current = store.current;
      stop();
      const id = request.current;
      const abort = new AbortController();
      controller.current = abort;
      const query = current.query;
      const cursor = reset ? null : current.cursor;
      commit({
        status: "loading",
        ...(reset
          ? { options: [], cursor: null, hasNext: false, loadedQuery: null }
          : {}),
      });
      let pending;
      try {
        pending = Promise.resolve(
          loader.current({
            query,
            cursor,
            limit: pageSize,
            signal: abort.signal,
          })
        );
      } catch (error) {
        pending = Promise.reject(error);
      }
      pending.then(
        (page) => {
          if (id !== request.current) return;
          const known = reset ? [] : store.current.options;
          const seen = new Set(known.map(optionKey));
          const fresh = (page?.data ?? []).filter((option) => {
            const key = optionKey(option);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const nextCursor = page?.meta?.nextCursor ?? null;
          commit({
            options: [...known, ...fresh],
            cursor: nextCursor,
            hasNext: Boolean(page?.meta?.hasNext && nextCursor),
            status: "ready",
            loadedQuery: query,
            lastAdded: fresh.length,
            revision: store.current.revision + 1,
          });
        },
        (error) => {
          if (id !== request.current || error?.name === "AbortError") return;
          commit({ status: "error", revision: store.current.revision + 1 });
        }
      );
    },
    [commit, pageSize, stop]
  );

  const search = useCallback(
    (query) => {
      stop();
      commit({
        query,
        options: [],
        cursor: null,
        hasNext: false,
        status: "loading",
        loadedQuery: null,
      });
      timer.current = setTimeout(() => fetchPage(true), debounceMs);
    },
    [commit, debounceMs, fetchPage, stop]
  );

  const ensureLoaded = useCallback(() => {
    const { status, loadedQuery, query } = store.current;
    if (status === "loading" || (status === "ready" && loadedQuery === query))
      return;
    fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    const { status, hasNext } = store.current;
    if (status === "ready" && hasNext) fetchPage(false);
  }, [fetchPage]);

  const retry = useCallback(() => {
    const { status, options } = store.current;
    if (status === "error") fetchPage(options.length === 0);
  }, [fetchPage]);

  const cancel = useCallback(() => {
    stop();
    if (store.current.status === "loading")
      commit({ status: store.current.loadedQuery === null ? "idle" : "ready" });
  }, [commit, stop]);

  const reset = useCallback(
    (query = "") => {
      stop();
      commit({ ...INITIAL, query, revision: store.current.revision });
    },
    [commit, stop]
  );

  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({ ...state, search, ensureLoaded, loadMore, retry, cancel, reset }),
    [state, search, ensureLoaded, loadMore, retry, cancel, reset]
  );
};

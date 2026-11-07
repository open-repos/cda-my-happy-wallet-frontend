import { describe, expect, it } from "vitest";

import { appendPage, firstPage, isRepeatedCursor } from "./pagination";

const page = (ids: number[], nextCursor: string | null) => ({
  data: ids.map((id) => ({ id })),
  meta: { limit: 20, hasNext: nextCursor !== null, nextCursor },
});

describe("envelope pagination (#384)", () => {
  it("keeps the cursor retryable until its page succeeds", () => {
    const state = firstPage(page([1, 2], "p2"));
    // Échec de la page 2 : l'état n'a pas changé, la relance est permise.
    expect(isRepeatedCursor(state)).toBe(false);

    const next = appendPage(state, page([3], "p3"));
    expect(next.rows.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(next.cursor).toBe("p3");
    expect(next.seen.has("p2")).toBe(true);
  });

  it("drops rows already loaded and detects a repeated cursor", () => {
    const state = appendPage(firstPage(page([1, 2], "p2")), page([2, 3], "p2"));
    expect(state.rows.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(isRepeatedCursor(state)).toBe(true);
  });
});

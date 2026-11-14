import { describe, expect, it } from "vitest";

import { createPostponedMonths } from "@/src/features/month-end/domain/postponedMonths";

describe("« Plus tard » for the session (#420)", () => {
  it("remembers a postponed month and notifies the listeners", () => {
    const store = createPostponedMonths();
    const seen: string[] = [];
    const unsubscribe = store.subscribe(() => seen.push("change"));
    expect(store.has("2026-10")).toBe(false);
    store.add("2026-10");
    store.add("2026-10");
    expect(store.has("2026-10")).toBe(true);
    expect(store.has("2026-11")).toBe(false);
    expect(seen).toEqual(["change"]);
    unsubscribe();
    store.add("2026-11");
    expect(seen).toEqual(["change"]);
  });
});

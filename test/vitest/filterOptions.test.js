import { describe, expect, it } from "vitest";
import {
  createArrayOptionSource,
  foldText,
  highlightMatch,
} from "../../src/js/utils/filterOptions";

describe("filterOptions (#360)", () => {
  it("compare sans casse ni accents", () => {
    expect(foldText("Électricité")).toBe("electricite");
    expect(foldText("ÇA")).toBe("ca");
  });

  it("repère la partie saisie dans le libellé d'origine", () => {
    expect(highlightMatch("Électricité", "elec")).toEqual([
      "",
      "Élec",
      "tricité",
    ]);
    expect(highlightMatch("Courses drive", "DRIVE")).toEqual([
      "Courses ",
      "drive",
      "",
    ]);
    expect(highlightMatch("Loyer", "zz")).toBeNull();
    expect(highlightMatch("Loyer", "")).toBeNull();
  });

  it("sert une liste locale par pages avec le contrat {data, meta}", async () => {
    const values = Array.from({ length: 23 }, (_, i) => ({
      value: i,
      label: `Valeur ${i}`,
    }));
    const load = createArrayOptionSource(values);
    const signal = new AbortController().signal;
    const first = await load({ query: "", cursor: null, limit: 10, signal });
    expect(first.data).toHaveLength(10);
    expect(first.meta).toMatchObject({ limit: 10, hasNext: true });
    const second = await load({
      query: "",
      cursor: first.meta.nextCursor,
      limit: 10,
      signal,
    });
    expect(second.data[0].value).toBe(10);
    const last = await load({
      query: "",
      cursor: second.meta.nextCursor,
      limit: 10,
      signal,
    });
    expect(last.data).toHaveLength(3);
    expect(last.meta).toMatchObject({ hasNext: false, nextCursor: null });
    const filtered = await load({ query: "valeur 2", limit: 10, signal });
    expect(filtered.data.map((o) => o.value)).toEqual([2, 20, 21, 22]);
  });

  it("refuse une requête annulée", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createArrayOptionSource([])({
        query: "",
        limit: 10,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

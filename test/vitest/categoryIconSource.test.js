import { afterEach, describe, expect, it, vi } from "vitest";

// Le module est simulé dans `setup.js` : ce fichier teste le vrai code.
vi.unmock("../../src/js/components/Categories/categoryIconSource");
const { fetchCategoryIcons } = await import(
  "../../src/js/components/Categories/categoryIconSource"
);

afterEach(() => vi.unstubAllGlobals());

describe("fetchCategoryIcons", () => {
  it("downloads the hashed icon file and returns its icons", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ icons: { "solid:film": [512, 512, "M0 0"] } }),
    });
    vi.stubGlobal("fetch", fetch);

    await expect(fetchCategoryIcons()).resolves.toEqual({
      "solid:film": [512, 512, "M0 0"],
    });
    expect(fetch.mock.calls[0][0]).toMatch(/category-icons.*\.json/);
  });

  it("rejects an HTTP error so that the picker can retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: vi.fn() })
    );
    await expect(fetchCategoryIcons()).rejects.toThrow(
      "Category icons request failed: 404"
    );
  });
});
